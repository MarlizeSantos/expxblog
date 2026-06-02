import { client } from '@/drizzle/db'

const getAppUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
const getServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

async function cronSchedule(jobName: string, schedule: string, endpoint: string): Promise<void> {
  const url = `${getAppUrl()}${endpoint}`
  const key = getServiceKey()
  const command = [
    'select net.http_post(',
    `  url := '${url}',`,
    `  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ${key}'),`,
    `  body := '{}'::jsonb,`,
    `  timeout_milliseconds := 600000`,
    ') as request_id;',
  ].join('\n')
  await client`select cron.schedule(${jobName}, ${schedule}, ${command})`
}

async function cronUnschedule(jobName: string): Promise<void> {
  await client`select cron.unschedule(${jobName})`
}

async function tryCron(fn: () => Promise<void>): Promise<void> {
  try { await fn() } catch { /* pg_cron not available or job doesn't exist — silent */ }
}

// ── RSS ──────────────────────────────────────────────────────────────────────

export async function scheduleRssCron(): Promise<void> {
  await tryCron(() => cronSchedule('rss-check-every-30min', '*/30 * * * *', '/api/cron/rss'))
}

export async function unscheduleRssCron(): Promise<void> {
  await tryCron(() => cronUnschedule('rss-check-every-30min'))
}

// ── Automation ───────────────────────────────────────────────────────────────

export async function scheduleAutomationCron(): Promise<void> {
  await tryCron(() => cronSchedule('automation-check-every-15min', '*/15 * * * *', '/api/cron/automation'))
}

export async function unscheduleAutomationCron(): Promise<void> {
  await tryCron(() => cronUnschedule('automation-check-every-15min'))
}

// ── Source Crawlers ──────────────────────────────────────────────────────────

export async function scheduleSourceCrawlersCron(): Promise<void> {
  await tryCron(() => cronSchedule('source-crawlers-check-every-15min', '*/15 * * * *', '/api/cron/source-crawlers'))
}

export async function unscheduleSourceCrawlersCron(): Promise<void> {
  await tryCron(() => cronUnschedule('source-crawlers-check-every-15min'))
}
