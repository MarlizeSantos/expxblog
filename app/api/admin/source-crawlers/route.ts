import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { sourceCrawlers, sourceCrawlerItems } from '@/drizzle/schema'
import { desc, eq, sql } from 'drizzle-orm'
import { scheduleSourceCrawlersCron } from '@/lib/supabase-cron'

export async function GET() {
  const crawlers = await db.select().from(sourceCrawlers).orderBy(desc(sourceCrawlers.created_at))

  const counts = await db
    .select({
      crawler_id: sourceCrawlerItems.crawler_id,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where status = 'done')::int`,
    })
    .from(sourceCrawlerItems)
    .groupBy(sourceCrawlerItems.crawler_id)

  const countMap = Object.fromEntries(counts.map((c) => [c.crawler_id, c]))

  return NextResponse.json({
    crawlers: crawlers.map((c) => ({
      ...c,
      items_total: countMap[c.id]?.total ?? 0,
      items_done: countMap[c.id]?.done ?? 0,
    })),
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    name?: string
    type?: string
    url?: string
    prompt?: string
    interval_hours?: number
    enabled?: boolean
    publish_status?: string
  }

  if (!body.name?.trim() || !body.url?.trim()) {
    return NextResponse.json({ error: 'Nome e URL são obrigatórios' }, { status: 400 })
  }

  const [crawler] = await db.insert(sourceCrawlers).values({
    name: body.name.trim(),
    type: body.type ?? 'custom',
    url: body.url.trim(),
    prompt: body.prompt?.trim() ?? '',
    interval_hours: body.interval_hours ?? 24,
    enabled: body.enabled ?? true,
    publish_status: body.publish_status ?? 'published',
  }).returning()

  if (crawler.enabled) await scheduleSourceCrawlersCron()

  return NextResponse.json({ crawler }, { status: 201 })
}
