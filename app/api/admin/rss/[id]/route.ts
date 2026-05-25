import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { rssFeeds, rssProcessedItems } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, id)).limit(1)
  if (!feed) return NextResponse.json({ error: 'Feed não encontrado' }, { status: 404 })

  const items = await db
    .select()
    .from(rssProcessedItems)
    .where(eq(rssProcessedItems.feed_id, id))
    .orderBy(desc(rssProcessedItems.processed_at))
    .limit(50)

  return NextResponse.json({ feed, items })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const body = await request.json() as {
    name?: string
    url?: string
    type?: string
    enabled?: boolean
    publish_status?: string
    check_interval_minutes?: number
  }

  const [updated] = await db
    .update(rssFeeds)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.url !== undefined ? { url: body.url } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      ...(body.publish_status !== undefined ? { publish_status: body.publish_status } : {}),
      ...(body.check_interval_minutes !== undefined ? { check_interval_minutes: body.check_interval_minutes } : {}),
      updated_at: new Date(),
    })
    .where(eq(rssFeeds.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Feed não encontrado' }, { status: 404 })

  return NextResponse.json({ feed: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  await db.delete(rssFeeds).where(eq(rssFeeds.id, id))
  return NextResponse.json({ ok: true })
}
