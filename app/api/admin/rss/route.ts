import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { rssFeeds, rssProcessedItems } from '@/drizzle/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { scheduleRssCron } from '@/lib/supabase-cron'

export async function GET() {
  const feeds = await db
    .select({
      id: rssFeeds.id,
      name: rssFeeds.name,
      url: rssFeeds.url,
      type: rssFeeds.type,
      enabled: rssFeeds.enabled,
      publish_status: rssFeeds.publish_status,
      check_interval_minutes: rssFeeds.check_interval_minutes,
      last_checked_at: rssFeeds.last_checked_at,
      last_error: rssFeeds.last_error,
      created_at: rssFeeds.created_at,
    })
    .from(rssFeeds)
    .orderBy(desc(rssFeeds.created_at))

  // Attach item counts
  const counts = await db
    .select({
      feed_id: rssProcessedItems.feed_id,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where status = 'done')::int`,
    })
    .from(rssProcessedItems)
    .groupBy(rssProcessedItems.feed_id)

  const countMap = Object.fromEntries(counts.map((c) => [c.feed_id, c]))

  return NextResponse.json({
    feeds: feeds.map((f) => ({
      ...f,
      items_total: countMap[f.id]?.total ?? 0,
      items_done: countMap[f.id]?.done ?? 0,
    })),
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    name: string
    url: string
    type?: string
    enabled?: boolean
    publish_status?: string
    check_interval_minutes?: number
  }

  if (!body.name?.trim() || !body.url?.trim()) {
    return NextResponse.json({ error: 'Nome e URL são obrigatórios' }, { status: 400 })
  }

  const [feed] = await db.insert(rssFeeds).values({
    name: body.name.trim(),
    url: body.url.trim(),
    type: body.type ?? 'blog',
    enabled: body.enabled ?? true,
    publish_status: body.publish_status ?? 'draft',
    check_interval_minutes: body.check_interval_minutes ?? 60,
  }).returning()

  if (feed.enabled) await scheduleRssCron()

  return NextResponse.json({ feed }, { status: 201 })
}
