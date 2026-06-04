import postgres from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { detectDbMode, poolMaxForMode } from '@/lib/db-connection'

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined
  // eslint-disable-next-line no-var
  var _drizzleDb: PostgresJsDatabase<typeof schema> | undefined
  // eslint-disable-next-line no-var
  var _resolvedDbUrl: string | undefined
}

function makeClient(url: string): ReturnType<typeof postgres> {
  // O max do pool é derivado do modo de conexão (porta da URL):
  // - session pooler (5432) / direct: max:1 — o session pooler limita a ~15
  //   conexões e cada lambda no Fluid Compute mantém seu próprio pool.
  // - transaction pooler (6543): max:10 — aguenta muitas conexões curtas.
  // O modo é configurável em /admin → Banco de Dados (reescreve a porta da URL).
  return postgres(url, {
    ssl: { rejectUnauthorized: false },
    max: poolMaxForMode(detectDbMode(url)),
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
  })
}

/**
 * Reconecta o DB com uma nova URL. Chamado após salvar database_url em site_settings.
 * Invalida o cache global para que a próxima query use a nova conexão.
 */
export function reconnectDb(url: string): void {
  global._resolvedDbUrl = url
  global._pgClient = makeClient(url)
  global._drizzleDb = drizzle(global._pgClient, { schema })
}

function getDb(): PostgresJsDatabase<typeof schema> {
  if (global._drizzleDb) return global._drizzleDb

  const url = process.env.DATABASE_URL!

  const client = global._pgClient ?? makeClient(url)

  // Mantém o cliente/instância em global SEMPRE (inclusive produção).
  // No Fluid Compute as instâncias de lambda são reutilizadas entre requests,
  // então reaproveitar o pool evita abrir conexões novas a cada invocação e
  // estourar o limite de 15 conexões do session pooler do Supabase.
  global._pgClient = client
  global._resolvedDbUrl = url

  const instance = drizzle(client, { schema })
  global._drizzleDb = instance

  return instance
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<typeof schema>]
  },
})

export const client = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop) {
    // ensure getDb() has been called so global._pgClient is set
    getDb()
    return global._pgClient![prop as keyof ReturnType<typeof postgres>]
  },
})
