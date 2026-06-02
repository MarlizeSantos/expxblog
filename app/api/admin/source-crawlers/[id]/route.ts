import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { sourceCrawlers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { runSingleCrawler } from '@/lib/source-crawlers/runner'
import { scheduleSourceCrawlersCron, unscheduleSourceCrawlersCron } from '@/lib/supabase-cron'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  const raw = await request.json() as Record<string, unknown>

  const allowed: Partial<{
    name: string
    type: string
    url: string
    prompt: string
    interval_hours: number
    enabled: boolean
    publish_status: string
  }> = {}

  if (typeof raw.name === 'string') allowed.name = raw.name.trim()
  if (typeof raw.type === 'string') allowed.type = raw.type
  if (typeof raw.url === 'string') allowed.url = raw.url.trim()
  if (typeof raw.prompt === 'string') allowed.prompt = raw.prompt
  if (typeof raw.interval_hours === 'number') allowed.interval_hours = raw.interval_hours
  if (typeof raw.enabled === 'boolean') allowed.enabled = raw.enabled
  if (typeof raw.publish_status === 'string') allowed.publish_status = raw.publish_status

  const [updated] = await db.update(sourceCrawlers)
    .set({ ...allowed, updated_at: new Date() })
    .where(eq(sourceCrawlers.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Sync pg_cron: check if any crawler is still enabled after this update
  if (typeof allowed.enabled === 'boolean') {
    const all = await db.select({ enabled: sourceCrawlers.enabled }).from(sourceCrawlers)
    const anyEnabled = all.some((c) => c.enabled)
    if (anyEnabled) await scheduleSourceCrawlersCron()
    else await unscheduleSourceCrawlersCron()
  }

  return NextResponse.json({ crawler: updated })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  await db.delete(sourceCrawlers).where(eq(sourceCrawlers.id, id))

  // Unschedule cron if no enabled crawlers remain
  const remaining = await db.select({ enabled: sourceCrawlers.enabled }).from(sourceCrawlers)
  if (!remaining.some((c) => c.enabled)) await unscheduleSourceCrawlersCron()

  return NextResponse.json({ ok: true })
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  try {
    const result = await runSingleCrawler(id)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
