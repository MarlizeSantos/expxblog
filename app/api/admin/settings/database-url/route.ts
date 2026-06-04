import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { maskDatabaseUrl, detectDbMode } from '@/lib/db-connection'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'database_url'))
      .limit(1)

    const rawUrl =
      rows.length > 0 && rows[0].value
        ? rows[0].value
        : process.env.DATABASE_URL ?? ''

    const source = rows.length > 0 && rows[0].value ? 'custom' : 'env'
    const masked = rawUrl ? maskDatabaseUrl(rawUrl) : '(não configurado)'
    const mode = rawUrl ? detectDbMode(rawUrl) : null

    return NextResponse.json({ masked, source, mode })
  } catch (err) {
    console.error('[settings/database-url GET]', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
