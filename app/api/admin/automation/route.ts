import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { automationConfig } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { scheduleAutomationCron, unscheduleAutomationCron } from '@/lib/supabase-cron'

export const dynamic = 'force-dynamic'

async function getOrCreate() {
  const rows = await db.select().from(automationConfig).limit(1)
  if (rows.length > 0) return rows[0]
  const [row] = await db.insert(automationConfig).values({}).returning()
  return row
}

export async function GET() {
  try {
    const config = await getOrCreate()
    return NextResponse.json({
      enabled: config.enabled,
      interval_hours: config.interval_hours,
      theme_ids: (() => { try { return JSON.parse(config.theme_ids) } catch { return [] } })(),
      custom_prompt: config.custom_prompt ?? '',
      last_run_at: config.last_run_at,
      next_run_at: config.next_run_at,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar configuração' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { enabled, interval_hours, theme_ids, custom_prompt } = body

    const config = await getOrCreate()
    const now = new Date()
    const hours = Math.max(15 / 60, Math.min(168, Number(interval_hours) || 24))

    // Reset to now only on false→true transition so the cron fires soon; preserve schedule on true→true
    const nextRun = enabled && !config.enabled ? now : config.next_run_at

    await db.update(automationConfig).set({
      enabled: Boolean(enabled),
      interval_hours: hours,
      theme_ids: JSON.stringify(Array.isArray(theme_ids) ? theme_ids : []),
      custom_prompt: custom_prompt?.trim() || null,
      next_run_at: nextRun,
      updated_at: now,
    }).where(eq(automationConfig.id, config.id))

    if (Boolean(enabled)) await scheduleAutomationCron()
    else await unscheduleAutomationCron()

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
