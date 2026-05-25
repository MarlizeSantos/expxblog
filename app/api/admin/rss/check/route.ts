import { NextResponse } from 'next/server'
import { checkAllFeeds } from '@/lib/rss-automation'

export const maxDuration = 800
export const dynamic = 'force-dynamic'

// Called by Vercel Cron and by the "Verificar agora" button in the UI
export async function POST() {
  try {
    const results = await checkAllFeeds()
    const processed = results.filter((r) => r.processedItem)
    const errors = results.filter((r) => r.error)

    return NextResponse.json({
      ok: true,
      feeds_checked: results.length,
      new_items_found: results.reduce((s, r) => s + r.newItems, 0),
      articles_generated: processed.length,
      errors: errors.map((r) => ({ feed: r.feedName, error: r.error })),
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// Vercel Cron uses GET for protected routes, so we expose GET as well
export async function GET() {
  return POST()
}
