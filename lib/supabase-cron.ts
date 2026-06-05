import postgres from 'postgres'

/**
 * Crons como estrutura versionada do banco.
 *
 * Este módulo é a fonte única de verdade para os jobs pg_cron do sistema.
 * As crons são provisionadas tanto no setup inicial quanto nas atualizações
 * do banco — quando o sistema detecta que um job esperado não existe, ele é
 * recriado automaticamente (igual ocorre com tabelas e colunas).
 *
 * Todas as crons são via Supabase (pg_cron + pg_net) — nunca via Vercel.
 *
 * IMPORTANTE — client real vs Proxy: o `client` exportado de `@/drizzle/db` é
 * um Proxy cujo target é `{}`. Ele funciona para acesso a propriedade
 * (`client.unsafe(...)`), mas NÃO é invocável como tagged template
 * (`` client`...` `` lança "client is not a function"). Por isso este módulo
 * roda as queries via `withCronClient`, que abre um `postgres()` real a partir
 * de DATABASE_URL — exceto quando um `client` real é injetado via `ctx`
 * (caso do setup, que ainda não tem DATABASE_URL no ambiente).
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

type CronClient = ReturnType<typeof postgres>

/** Valores resolvidos em runtime; sobrescrevem o que vem de process.env. */
type CronContext = {
  appUrl?: string
  serviceKey?: string
  client?: CronClient
}

type CronKind = 'always' | 'conditional'

type CronDef = {
  jobName: string
  schedule: string
  endpoint: string
  kind: CronKind
}

export type CronReport = {
  extensionsOk: boolean
  missingExtensions: string[]
  scheduled: string[]
  unscheduled: string[]
  errors: { job: string; message: string }[]
}

/** Estado desejado das crons, resolvido uma única vez a partir do banco. */
type DesiredState = {
  /** Mapa jobName → deve existir. */
  shouldExist: Record<string, boolean>
}

// ── Definições ─────────────────────────────────────────────────────────────────

export const CRON_DEFS: Record<string, CronDef> = {
  lgpd: {
    jobName: 'lgpd-data-retention',
    schedule: '0 3 * * *',
    endpoint: '/api/cron/data-retention',
    kind: 'always',
  },
  rss: {
    jobName: 'rss-check-every-30min',
    schedule: '*/30 * * * *',
    endpoint: '/api/cron/rss',
    kind: 'conditional',
  },
  automation: {
    jobName: 'automation-check-every-15min',
    schedule: '*/15 * * * *',
    endpoint: '/api/cron/automation',
    kind: 'conditional',
  },
  sourceCrawlers: {
    jobName: 'source-crawlers-check-every-15min',
    schedule: '*/15 * * * *',
    endpoint: '/api/cron/source-crawlers',
    kind: 'conditional',
  },
}

/** Jobs de versões antigas que devem ser removidos para evitar duplicidade. */
const LEGACY_JOB_NAMES = ['automation-every-15min', 'automation-check-every-5min']

/** Todos os jobs gerenciados (canônicos + legados). */
const ALL_MANAGED_JOBS = [
  ...Object.values(CRON_DEFS).map((d) => d.jobName),
  ...LEGACY_JOB_NAMES,
]

// ── Helpers de contexto ────────────────────────────────────────────────────────

const normalizeUrl = (u: string) => u.trim().replace(/\/$/, '')

const getAppUrl = (ctx?: CronContext) =>
  normalizeUrl(ctx?.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '')
const getServiceKey = (ctx?: CronContext) =>
  ctx?.serviceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

/**
 * Executa `fn` com um client postgres REAL (chamável como tagged template).
 * Se `ctx.client` for fornecido, usa-o (sem criar/encerrar conexão própria).
 * Caso contrário, abre um `postgres()` dedicado a partir de DATABASE_URL e o
 * encerra ao final — nunca usa o Proxy `defaultClient` (não é invocável).
 */
async function withCronClient<T>(
  ctx: CronContext | undefined,
  fn: (sql: CronClient) => Promise<T>
): Promise<T> {
  if (ctx?.client) return fn(ctx.client)

  const url = process.env.DATABASE_URL
  if (!url) {
    // Sem DATABASE_URL e sem client injetado não há como operar.
    // Última tentativa: o Proxy só serve para `.unsafe`, então falha aqui.
    throw new Error('DATABASE_URL ausente e nenhum client injetado para operações de cron')
  }

  const sql = postgres(url, {
    ssl: { rejectUnauthorized: false },
    max: 1,
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 5,
    max_lifetime: 30,
  })
  try {
    return await fn(sql)
  } finally {
    await sql.end().catch(() => {})
  }
}

// ── Primitivas de agendamento ──────────────────────────────────────────────────

function buildCronCommand(endpoint: string, appUrl: string, key: string): string {
  const url = `${appUrl}${endpoint}`
  return [
    'select net.http_post(',
    `  url := '${url}',`,
    `  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ${key}'),`,
    `  body := '{}'::jsonb,`,
    `  timeout_milliseconds := 600000`,
    ') as request_id;',
  ].join('\n')
}

/**
 * Agenda (upsert) um job. Exige appUrl e serviceKey resolvidos — sem eles o
 * comando geraria uma URL sem host / auth vazia, criando um job que falha
 * silenciosamente a cada execução. Lança se faltarem, para o caller reportar.
 */
async function cronSchedule(
  sql: CronClient,
  jobName: string,
  schedule: string,
  endpoint: string,
  appUrl: string,
  key: string
): Promise<void> {
  if (!appUrl) throw new Error('URL pública do app ausente (NEXT_PUBLIC_APP_URL)')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente')
  if (appUrl.includes("'") || key.includes("'")) {
    throw new Error('appUrl/serviceKey contém aspa simples — recusado por segurança')
  }
  const command = buildCronCommand(endpoint, appUrl, key)
  await sql`select cron.schedule(${jobName}, ${schedule}, ${command})`
}

async function cronUnschedule(sql: CronClient, jobName: string): Promise<void> {
  await sql`select cron.unschedule(${jobName})`
}

// ── Extensões ──────────────────────────────────────────────────────────────────

/**
 * Garante que pg_cron e pg_net estejam habilitadas. No Supabase normalmente já
 * vêm habilitadas via Dashboard; tentamos habilitar e toleramos falta de
 * privilégio. NÃO engole o resultado — reporta o que ficou faltando para que o
 * admin receba feedback (em vez de falha silenciosa).
 */
export async function ensureExtensions(
  ctx?: CronContext
): Promise<{ ok: boolean; missing: string[] }> {
  return withCronClient(ctx, async (sql) => {
    await tryCreateExtension(sql, 'create extension if not exists pg_net with schema extensions')
    await tryCreateExtension(sql, 'create extension if not exists pg_cron')

    const present = await listInstalledExtensions(sql)
    const missing: string[] = []
    if (!present.includes('pg_cron')) missing.push('pg_cron')
    if (!present.includes('pg_net')) missing.push('pg_net')
    return { ok: missing.length === 0, missing }
  })
}

async function tryCreateExtension(sql: CronClient, statement: string): Promise<void> {
  try {
    await sql.unsafe(statement)
  } catch {
    // 42501 insufficient_privilege ou extensão fora da allowlist — tolerar.
    // A verificação real é feita por listInstalledExtensions logo em seguida.
  }
}

async function listInstalledExtensions(sql: CronClient): Promise<string[]> {
  try {
    const rows = await sql<{ extname: string }[]>`
      select extname from pg_extension where extname in ('pg_cron', 'pg_net')
    `
    return rows.map((r) => r.extname)
  } catch {
    return []
  }
}

// ── Detecção de jobs ───────────────────────────────────────────────────────────

/**
 * Lista os nomes de jobs pg_cron atualmente agendados (dentre os fornecidos).
 * Se pg_cron não existe, a consulta a cron.job lança erro (42P01 / 3F000) —
 * tratamos como "nenhum job existe" e sinalizamos a extensão ausente.
 */
async function listScheduledJobs(
  sql: CronClient,
  jobNames: string[]
): Promise<{ existing: string[]; cronAvailable: boolean }> {
  try {
    const rows = await sql<{ jobname: string }[]>`
      select jobname from cron.job where jobname = any(${jobNames})
    `
    return { existing: rows.map((r) => r.jobname), cronAvailable: true }
  } catch {
    return { existing: [], cronAvailable: false }
  }
}

/**
 * Retorna quais crons esperadas estão FALTANDO no banco, dado o estado atual.
 * Considera só as crons que DEVERIAM existir: as 'always' sempre; as
 * 'conditional' apenas quando o recurso correspondente está ativo.
 */
export async function getMissingCrons(
  ctx?: CronContext
): Promise<{ missing: string[]; cronAvailable: boolean }> {
  return withCronClient(ctx, async (sql) => {
    const desired = await resolveDesiredState(sql)
    const expected = Object.keys(desired.shouldExist).filter((j) => desired.shouldExist[j])
    const { existing, cronAvailable } = await listScheduledJobs(sql, expected)
    const missing = expected.filter((j) => !existing.includes(j))
    return { missing, cronAvailable }
  })
}

// ── Estado desejado (resolvido uma vez) ─────────────────────────────────────────

/**
 * Resolve o estado desejado das crons numa única passada ao banco. Os três
 * predicados condicionais rodam em paralelo. Fonte única consumida tanto pela
 * detecção (getMissingCrons) quanto pela aplicação (ensureCrons), evitando que
 * detecção e reconciliação divirjam (o que causaria modal em loop).
 *
 * Cada predicado lança em erro real (não engole) — assim uma falha transitória
 * de DB NÃO é interpretada como "recurso desativado", o que desagendaria uma
 * cron ativa por engano.
 */
async function resolveDesiredState(sql: CronClient): Promise<DesiredState> {
  const [rssActive, automationActive, crawlersActive] = await Promise.all([
    hasActiveRssFeeds(sql),
    isAutomationEnabled(sql),
    hasActiveSourceCrawlers(sql),
  ])

  return {
    shouldExist: {
      [CRON_DEFS.lgpd.jobName]: true, // 'always'
      [CRON_DEFS.rss.jobName]: rssActive,
      [CRON_DEFS.automation.jobName]: automationActive,
      [CRON_DEFS.sourceCrawlers.jobName]: crawlersActive,
    },
  }
}

async function isAutomationEnabled(sql: CronClient): Promise<boolean> {
  const rows = await sql<{ enabled: boolean }[]>`
    select enabled from automation_config order by id asc limit 1
  `
  return rows[0]?.enabled === true
}

async function hasActiveRssFeeds(sql: CronClient): Promise<boolean> {
  const rows = await sql<{ n: number }[]>`
    select count(*)::int as n from rss_feeds where enabled = true
  `
  return (rows[0]?.n ?? 0) > 0
}

async function hasActiveSourceCrawlers(sql: CronClient): Promise<boolean> {
  const rows = await sql<{ n: number }[]>`
    select count(*)::int as n from source_crawlers where enabled = true
  `
  return (rows[0]?.n ?? 0) > 0
}

// ── Reconciliador central ──────────────────────────────────────────────────────

/**
 * Reconcilia o estado das crons com o estado esperado:
 * - LGPD: sempre agendada (upsert).
 * - RSS/automação/crawlers: agendadas se o recurso está ativo; removidas se não.
 * - Jobs legados: sempre removidos.
 *
 * Diferente dos toggles individuais (que silenciam erros), aqui coletamos os
 * erros e os reportamos para feedback ao admin. Se o estado desejado não puder
 * ser resolvido (erro de DB), aborta sem desagendar nada — nunca remove cron
 * ativa por causa de um blip transitório.
 */
export async function ensureCrons(ctx?: CronContext): Promise<CronReport> {
  const report: CronReport = {
    extensionsOk: true,
    missingExtensions: [],
    scheduled: [],
    unscheduled: [],
    errors: [],
  }

  const ext = await ensureExtensions(ctx)
  report.extensionsOk = ext.ok
  report.missingExtensions = ext.missing
  if (!ext.ok) return report // Sem extensão não há como agendar; evita loop.

  const appUrl = getAppUrl(ctx)
  const key = getServiceKey(ctx)

  await withCronClient(ctx, async (sql) => {
    // Resolve o estado desejado UMA vez. Se falhar, aborta sem mexer em nada.
    let desired: DesiredState
    try {
      desired = await resolveDesiredState(sql)
    } catch (err) {
      report.errors.push({ job: '*', message: `Falha ao ler estado dos recursos: ${messageOf(err)}` })
      return
    }

    const { existing } = await listScheduledJobs(sql, ALL_MANAGED_JOBS)

    // 1. Remover jobs legados (apenas se existirem).
    for (const legacy of LEGACY_JOB_NAMES) {
      if (existing.includes(legacy)) {
        try {
          await cronUnschedule(sql, legacy)
          report.unscheduled.push(legacy)
        } catch (err) {
          report.errors.push({ job: legacy, message: messageOf(err) })
        }
      }
    }

    // 2. Reconciliar os 4 jobs canônicos conforme o estado desejado.
    for (const def of Object.values(CRON_DEFS)) {
      const shouldExist = desired.shouldExist[def.jobName] === true
      try {
        if (shouldExist) {
          // cron.schedule é upsert por jobname — seguro reescrever (cobre rotação de key/url).
          await cronSchedule(sql, def.jobName, def.schedule, def.endpoint, appUrl, key)
          report.scheduled.push(def.jobName)
        } else if (existing.includes(def.jobName)) {
          // unschedule só se o job existir (cron.unschedule lança erro em job inexistente).
          await cronUnschedule(sql, def.jobName)
          report.unscheduled.push(def.jobName)
        }
      } catch (err) {
        report.errors.push({ job: def.jobName, message: messageOf(err) })
      }
    }
  })

  return report
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// ── Toggles individuais (chamados pelas rotas admin ao ativar/desativar) ─────────
//
// Mantêm o comportamento silencioso (tryCron): uma falha aqui não deve quebrar
// a resposta da rota de toggle. A reconciliação completa via ensureCrons corrige
// qualquer divergência depois.

async function tryToggle(jobKey: keyof typeof CRON_DEFS, enable: boolean): Promise<void> {
  const def = CRON_DEFS[jobKey]
  try {
    await withCronClient(undefined, async (sql) => {
      if (enable) {
        await cronSchedule(sql, def.jobName, def.schedule, def.endpoint, getAppUrl(), getServiceKey())
      } else {
        await cronUnschedule(sql, def.jobName)
      }
    })
  } catch {
    /* pg_cron indisponível, job inexistente ou env ausente — silencioso por design */
  }
}

export async function scheduleRssCron(): Promise<void> {
  await tryToggle('rss', true)
}
export async function unscheduleRssCron(): Promise<void> {
  await tryToggle('rss', false)
}

export async function scheduleAutomationCron(): Promise<void> {
  await tryToggle('automation', true)
}
export async function unscheduleAutomationCron(): Promise<void> {
  await tryToggle('automation', false)
}

export async function scheduleSourceCrawlersCron(): Promise<void> {
  await tryToggle('sourceCrawlers', true)
}
export async function unscheduleSourceCrawlersCron(): Promise<void> {
  await tryToggle('sourceCrawlers', false)
}

// ── LGPD (sempre garantida; helper usado pelo setup com client injetado) ─────────

export async function scheduleLgpdRetentionCron(ctx?: CronContext): Promise<void> {
  const appUrl = getAppUrl(ctx)
  const key = getServiceKey(ctx)
  await withCronClient(ctx, (sql) =>
    cronSchedule(sql, CRON_DEFS.lgpd.jobName, CRON_DEFS.lgpd.schedule, CRON_DEFS.lgpd.endpoint, appUrl, key)
  )
}

export { normalizeUrl }
