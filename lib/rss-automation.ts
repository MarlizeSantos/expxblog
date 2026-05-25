import Parser from 'rss-parser'
import { db } from '@/drizzle/db'
import { rssFeeds, rssProcessedItems } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { createPipelineStream } from '@/lib/agent-pipeline'
import type { PipelineEvent } from '@/lib/agents/types'

export type RssFeedItem = {
  guid: string
  url: string
  title: string
  description: string
  pubDate?: string
}

export type RssCheckResult = {
  feedId: number
  feedName: string
  newItems: number
  processedItem?: { itemId: number; postId?: number }
  error?: string
}

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'ExpxBlog/1.0 RSS Reader' },
})

export async function parseFeed(url: string): Promise<RssFeedItem[]> {
  const feed = await parser.parseURL(url)
  return (feed.items ?? []).map((item) => ({
    guid: item.guid ?? item.link ?? item.id ?? String(Date.now()),
    url: item.link ?? item.guid ?? '',
    title: item.title ?? 'Sem título',
    description: item.contentSnippet ?? item.summary ?? item.content ?? '',
    pubDate: item.pubDate ?? item.isoDate,
  }))
}

// Checks one feed: discovers new items, marks them as queued, processes the first one
export async function processFeed(feedId: number): Promise<RssCheckResult> {
  const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, feedId)).limit(1)
  if (!feed) return { feedId, feedName: '?', newItems: 0, error: 'Feed não encontrado' }

  let items: RssFeedItem[]
  try {
    items = await parseFeed(feed.url)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await db.update(rssFeeds).set({ last_error: error, last_checked_at: new Date(), updated_at: new Date() }).where(eq(rssFeeds.id, feedId))
    return { feedId, feedName: feed.name, newItems: 0, error }
  }

  // Mark feed as checked and clear previous error
  await db.update(rssFeeds).set({ last_checked_at: new Date(), last_error: null, updated_at: new Date() }).where(eq(rssFeeds.id, feedId))

  // Find already-processed guids for this feed
  const processed = await db.select({ item_guid: rssProcessedItems.item_guid })
    .from(rssProcessedItems)
    .where(eq(rssProcessedItems.feed_id, feedId))
  const processedGuids = new Set(processed.map((r) => r.item_guid))

  // Queue new items (newest-first, skip already seen)
  const newItems = items.filter((item) => !processedGuids.has(item.guid))
  if (newItems.length === 0) {
    return { feedId, feedName: feed.name, newItems: 0 }
  }

  // Insert all new items as queued
  for (const item of newItems) {
    await db.insert(rssProcessedItems).values({
      feed_id: feedId,
      item_guid: item.guid,
      item_url: item.url,
      item_title: item.title,
      status: 'queued',
    }).onConflictDoNothing()
  }

  // Process only the first queued item (avoid timeout)
  const firstItem = newItems[0]
  const [queuedRow] = await db
    .select()
    .from(rssProcessedItems)
    .where(and(eq(rssProcessedItems.feed_id, feedId), eq(rssProcessedItems.item_guid, firstItem.guid)))
    .limit(1)

  if (!queuedRow) return { feedId, feedName: feed.name, newItems: newItems.length }

  // Mark as processing
  await db.update(rssProcessedItems).set({ status: 'processing' }).where(eq(rssProcessedItems.id, queuedRow.id))

  try {
    const postId = await runPipelineForItem(firstItem, feed.publish_status as 'draft' | 'published')
    await db.update(rssProcessedItems).set({ status: 'done', post_id: postId }).where(eq(rssProcessedItems.id, queuedRow.id))
    return { feedId, feedName: feed.name, newItems: newItems.length, processedItem: { itemId: queuedRow.id, postId } }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await db.update(rssProcessedItems).set({ status: 'error', error }).where(eq(rssProcessedItems.id, queuedRow.id))
    return { feedId, feedName: feed.name, newItems: newItems.length, processedItem: { itemId: queuedRow.id }, error }
  }
}

async function runPipelineForItem(
  item: RssFeedItem,
  publishStatus: 'draft' | 'published'
): Promise<number | undefined> {
  const initialContext: Record<string, unknown> = {
    themeTitle: item.title,
    ...(item.description ? { themeDescription: item.description.slice(0, 500) } : {}),
    ...(item.url ? { researchLinks: [item.url] } : {}),
  }

  const stream = createPipelineStream({
    themeIds: [],
    triggers: { publishStatus },
    initialContext,
  })

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastEvent: PipelineEvent | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.replace(/^data: /, '').trim()
      if (!line) continue
      try { lastEvent = JSON.parse(line) as PipelineEvent } catch {}
    }
  }

  if (!lastEvent || lastEvent.type === 'pipeline_error') {
    throw new Error(lastEvent?.message ?? 'Pipeline falhou sem retorno')
  }

  return lastEvent.data?.post_id as number | undefined
}

// Checks all enabled feeds that are due for a check
export async function checkAllFeeds(): Promise<RssCheckResult[]> {
  const feeds = await db.select().from(rssFeeds).where(eq(rssFeeds.enabled, true))
  const results: RssCheckResult[] = []

  for (const feed of feeds) {
    const isDue = !feed.last_checked_at ||
      Date.now() - new Date(feed.last_checked_at).getTime() >= feed.check_interval_minutes * 60 * 1000

    if (!isDue) {
      results.push({ feedId: feed.id, feedName: feed.name, newItems: 0 })
      continue
    }

    const result = await processFeed(feed.id)
    results.push(result)
  }

  return results
}
