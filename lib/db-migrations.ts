// lib/db-migrations.ts
import postgres from 'postgres'
import { db } from '@/drizzle/db'
import { sql } from 'drizzle-orm'
import { EMBEDDED_MIGRATIONS, MIGRATION_ORDER } from './migrations-embedded'

/**
 * Converte a URL do pooler do Supabase para a URL de conexão direta, se aplicável.
 * Pooler: postgres.PROJECT:SENHA@aws-0-REGION.pooler.supabase.com:PORT
 * Direta: postgres:SENHA@db.PROJECT.supabase.co:5432
 *
 * Projetos Supabase antigos expõem o hostname direto; projetos novos só têm pooler.
 * Por isso tentamos a direta primeiro e caímos para o pooler se o DNS falhar.
 */
function toDirectUrl(poolerUrl: string): string | null {
  try {
    const u = new URL(poolerUrl)
    const username = u.username
    const host = u.hostname

    if (host.includes('.pooler.supabase.com') && username.startsWith('postgres.')) {
      const projectId = username.slice('postgres.'.length)
      const directUrl = new URL(poolerUrl)
      directUrl.username = 'postgres'
      directUrl.hostname = `db.${projectId}.supabase.co`
      directUrl.port = '5432'
      return directUrl.toString()
    }
  } catch {
    // URL inválida
  }
  return null
}

function makeClient(url: string): ReturnType<typeof postgres> {
  return postgres(url, {
    ssl: { rejectUnauthorized: false },
    max: 1,
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 5,
    max_lifetime: 30,
  })
}

/**
 * Executa uma operação com um cliente postgres dedicado de 1 conexão.
 * Tenta a conexão direta primeiro; se o DNS falhar (ENOTFOUND/EAI_AGAIN),
 * cai de volta para a URL original (pooler).
 */
async function withMigrationClient<T>(
  fn: (client: ReturnType<typeof postgres>) => Promise<T>
): Promise<T> {
  const poolerUrl = process.env.DATABASE_URL!
  const directUrl = toDirectUrl(poolerUrl)

  if (directUrl) {
    const directClient = makeClient(directUrl)
    try {
      return await fn(directClient)
    } catch (err) {
      const code = (err as { code?: string })?.code
      // DNS não resolveu o hostname direto — projeto novo, usa o pooler
      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        await directClient.end().catch(() => {})
        const poolerClient = makeClient(poolerUrl)
        try {
          return await fn(poolerClient)
        } finally {
          await poolerClient.end().catch(() => {})
        }
      }
      throw err
    } finally {
      await directClient.end().catch(() => {})
    }
  }

  const poolerClient = makeClient(poolerUrl)
  try {
    return await fn(poolerClient)
  } finally {
    await poolerClient.end().catch(() => {})
  }
}

async function getAppliedMigrations(): Promise<string[]> {
  try {
    const rows = await db.execute(
      sql`SELECT migration_name FROM drizzle_migrations ORDER BY created_at ASC`
    )
    return (rows as unknown as { migration_name: string }[]).map((r) => r.migration_name)
  } catch {
    return []
  }
}

// Tabelas que o schema completo deve conter. Derivado de drizzle/schema.ts.
const EXPECTED_TABLES = [
  'users',
  'posts',
  'categories',
  'tags',
  'post_categories',
  'post_tags',
  'site_settings',
  'api_tokens',
  'article_themes',
  'page_views',
  'newsletter_subscribers',
  'automation_config',
  'agent_configs',
  'rss_feeds',
  'rss_processed_items',
  'automation_logs',
  'source_crawlers',
  'source_crawler_items',
  'ai_request_logs',
  'webhooks',
  'chat_conversations',
  'chat_messages',
] as const

/** Retorna quais tabelas esperadas ESTÃO FALTANDO no banco. */
async function getMissingTables(): Promise<string[]> {
  try {
    const rows = await db.execute(
      sql`SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name = ANY(${EXPECTED_TABLES as unknown as string[]})`
    )
    const existing = new Set(
      (rows as unknown as { table_name: string }[]).map((r) => r.table_name)
    )
    return EXPECTED_TABLES.filter((t) => !existing.has(t))
  } catch {
    return []
  }
}

/**
 * Colunas críticas que devem existir para o sistema funcionar corretamente.
 * Formato: { table: string; column: string }[]
 * Se alguma estiver faltando, todas as migrations são re-aplicadas de forma idempotente.
 */
const EXPECTED_COLUMNS = [
  { table: 'newsletter_subscribers', column: 'unsubscribe_token' },
  { table: 'posts', column: 'newsletter_sent_at' },
  { table: 'newsletter_subscribers', column: 'consent_at' },
  { table: 'newsletter_subscribers', column: 'consent_text_version' },
  { table: 'posts', column: 'author_name' },
] as const

/** Retorna true se alguma coluna crítica estiver faltando no banco. */
async function hasMissingColumns(): Promise<boolean> {
  try {
    for (const { table, column } of EXPECTED_COLUMNS) {
      const rows = await db.execute(
        sql`SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = ${table}
              AND column_name = ${column}
            LIMIT 1`
      )
      if ((rows as unknown[]).length === 0) return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Flag de processo: uma vez que o schema esteja completo (sem tabelas faltando e
 * sem migrations pendentes), curto-circuita as próximas chamadas retornando []
 * imediatamente. Só o estado "completo" é cacheado — se houver pendências, a
 * flag permanece false e cada chamada consulta o banco normalmente.
 */
let schemaComplete = false

export async function getDbPendingMigrations(): Promise<string[]> {
  // Curto-circuito: banco confirmado completo neste processo, sem necessidade de query.
  if (schemaComplete) return []

  const applied = await getAppliedMigrations()
  const pendingByVersion = MIGRATION_ORDER.filter((tag) => !applied.includes(tag))

  // Verificação de drift real: mesmo que drizzle_migrations registre tudo aplicado,
  // se uma tabela ou coluna crítica não existir no banco retornamos as migrations pendentes.
  const missing = await getMissingTables()
  if (missing.length > 0) {
    // Retorna TODAS as migrations em ordem para que o applyMigration idempotente
    // recrie apenas o que está faltando.
    return MIGRATION_ORDER
  }

  const columnsMissing = await hasMissingColumns()
  if (columnsMissing) {
    // Coluna crítica ausente — re-aplica migrations a partir de onde a coluna foi adicionada.
    // Como applyMigration é idempotente, retornar todas é seguro.
    return MIGRATION_ORDER
  }

  if (pendingByVersion.length === 0) {
    // Schema completo — grava a flag para evitar queries desnecessárias nos renders seguintes.
    schemaComplete = true
  }

  return pendingByVersion
}

export async function ensureMigrationsTable(): Promise<void> {
  await withMigrationClient((client) =>
    client.unsafe(`
      CREATE TABLE IF NOT EXISTS drizzle_migrations (
        id serial PRIMARY KEY,
        migration_name text NOT NULL UNIQUE,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `)
  )
}

/**
 * Torna um statement DDL idempotente:
 * - CREATE TABLE → CREATE TABLE IF NOT EXISTS
 * - CREATE INDEX → CREATE INDEX IF NOT EXISTS
 * - CREATE UNIQUE INDEX → CREATE UNIQUE INDEX IF NOT EXISTS
 * - ADD COLUMN → ADD COLUMN IF NOT EXISTS
 * - ADD CONSTRAINT … ALTER TABLE statements são executados individualmente
 *   e erros de objeto duplicado (42710 / 42P07) são ignorados.
 */
function makeIdempotent(stmt: string): string {
  return stmt
    .replace(/CREATE TABLE(?!\s+IF NOT EXISTS)/gi, 'CREATE TABLE IF NOT EXISTS')
    .replace(/CREATE UNIQUE INDEX(?!\s+IF NOT EXISTS)/gi, 'CREATE UNIQUE INDEX IF NOT EXISTS')
    .replace(/CREATE INDEX(?!\s+IF NOT EXISTS)/gi, 'CREATE INDEX IF NOT EXISTS')
    .replace(/ADD COLUMN(?!\s+IF NOT EXISTS)/gi, 'ADD COLUMN IF NOT EXISTS')
}

/** Códigos PostgreSQL que indicam que o objeto já existe — ignorar com segurança. */
const ALREADY_EXISTS_CODES = new Set(['42P07', '42710', '42701'])

export async function applyMigration(tag: string): Promise<void> {
  const raw = EMBEDDED_MIGRATIONS[tag]
  if (!raw) {
    throw new Error(`Migration não encontrada no bundle: ${tag}`)
  }

  const statements = raw
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)

  await withMigrationClient(async (client) => {
    for (const statement of statements) {
      const idempotent = makeIdempotent(statement)
      try {
        await client.unsafe(idempotent)
      } catch (err) {
        const code = (err as { code?: string })?.code
        if (code && ALREADY_EXISTS_CODES.has(code)) {
          // Objeto já existe — seguro ignorar
          continue
        }
        throw err
      }
    }
    await client`
      INSERT INTO drizzle_migrations (migration_name)
      VALUES (${tag})
      ON CONFLICT (migration_name) DO NOTHING
    `
  })
}
