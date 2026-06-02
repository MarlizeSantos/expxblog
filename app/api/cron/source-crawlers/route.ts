import { NextRequest, NextResponse } from 'next/server'
import { runDueCrawlers } from '@/lib/source-crawlers/runner'

export const maxDuration = 800
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await runDueCrawlers()
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({
      ok: true,
      crawlers_run: results.length,
      articles_generated: successful.length,
      errors: failed.map((r) => ({ crawler: r.crawlerName, error: r.error })),
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Cron Source Crawlers] failed:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
