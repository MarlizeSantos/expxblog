import { NextResponse } from 'next/server'
import { getOnboardingStatus } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const status = await getOnboardingStatus()
    return NextResponse.json(status)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[onboarding/status GET]', msg)
    return NextResponse.json({ error: 'Erro ao carregar status do onboarding' }, { status: 500 })
  }
}
