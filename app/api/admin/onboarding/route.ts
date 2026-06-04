import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function upsertSetting(key: string, value: string) {
  const now = new Date()
  await db
    .insert(siteSettings)
    .values({ key, value, updated_at: now })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updated_at: now } })
}

async function getSetting(key: string): Promise<string> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1)
  return rows.length > 0 ? rows[0].value : ''
}

export async function GET() {
  try {
    const completedRaw = await getSetting('onboarding_completed')
    const stepRaw = await getSetting('onboarding_step')

    const completed = completedRaw === 'true'
    const step = stepRaw ? parseInt(stepRaw, 10) : 0

    return NextResponse.json({ completed, step: isNaN(step) ? 0 : step })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[onboarding GET]', msg)
    return NextResponse.json({ error: 'Erro ao carregar estado do onboarding' }, { status: 500 })
  }
}

const putSchema = z.object({
  completed: z.boolean().optional(),
  step: z.number().int().min(0).optional(),
})

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const parsed = putSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos: ' + parsed.error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { completed, step } = parsed.data

    if (completed !== undefined) {
      await upsertSetting('onboarding_completed', completed ? 'true' : 'false')
    }

    if (step !== undefined) {
      await upsertSetting('onboarding_step', String(step))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[onboarding PUT]', msg)
    return NextResponse.json({ error: msg || 'Erro interno do servidor' }, { status: 500 })
  }
}
