import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { getSettings } from '@/lib/settings'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use formato #RRGGBB)')

const putSchema = z.object({
  template: z.enum(['default', 'portal', 'business', 'news', 'tech']).optional(),
  colors: z
    .object({
      primary: hexColor,
      secondary: hexColor,
      background: hexColor,
      surface: hexColor,
    })
    .optional(),
  company: z
    .object({
      logo_url: z.string().max(500).optional(),
      blog_name: z.string().max(100).optional(),
      blog_description: z.string().max(500).optional(),
      company_name: z.string().max(150).optional(),
      company_email: z.string().email().or(z.literal('')).optional(),
      company_phone: z.string().max(30).optional(),
      company_address: z.string().max(300).optional(),
      company_cnpj: z.string().max(20).optional(),
      social_facebook: z.string().max(200).optional(),
      social_instagram: z.string().max(200).optional(),
      social_twitter: z.string().max(200).optional(),
      social_youtube: z.string().max(200).optional(),
    })
    .optional(),
  ai: z
    .object({
      api_key: z.string().optional(),
      models: z.record(z.string()).optional(),
    })
    .optional(),
  newsletter: z
    .object({
      enabled: z.boolean().optional(),
      title: z.string().max(200).optional(),
      subtitle: z.string().max(500).optional(),
    })
    .optional(),
  telegram: z
    .object({
      bot_token: z.string().optional(),
      allowed_chat_ids: z.string().max(500).optional(),
    })
    .optional(),
})

export async function GET() {
  try {
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (err) {
    console.error('[settings GET] error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const parsed = putSchema.safeParse(body)

    if (!parsed.success) {
      console.error('[settings PUT] validation error:', JSON.stringify(parsed.error.flatten()))
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { template, colors, company, ai, newsletter, telegram } = parsed.data
    const now = new Date()

    if (template !== undefined) {
      await db
        .insert(siteSettings)
        .values({ key: 'active_template', value: template, updated_at: now })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: template, updated_at: now } })
    }

    if (colors !== undefined) {
      const colorsJson = JSON.stringify(colors)
      await db
        .insert(siteSettings)
        .values({ key: 'theme_colors', value: colorsJson, updated_at: now })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: colorsJson, updated_at: now } })
    }

    if (company !== undefined) {
      const current = await getSettings()
      const merged = { ...current.company, ...company }
      const companyJson = JSON.stringify(merged)
      await db
        .insert(siteSettings)
        .values({ key: 'company_info', value: companyJson, updated_at: now })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: companyJson, updated_at: now } })
    }

    if (ai !== undefined) {
      if (ai.api_key !== undefined) {
        await db
          .insert(siteSettings)
          .values({ key: 'ai_api_key', value: ai.api_key, updated_at: now })
          .onConflictDoUpdate({ target: siteSettings.key, set: { value: ai.api_key, updated_at: now } })
      }
      if (ai.models !== undefined) {
        const modelsJson = JSON.stringify(ai.models)
        await db
          .insert(siteSettings)
          .values({ key: 'ai_models', value: modelsJson, updated_at: now })
          .onConflictDoUpdate({ target: siteSettings.key, set: { value: modelsJson, updated_at: now } })
      }
    }

    if (newsletter !== undefined) {
      const current = await getSettings()
      const merged = { ...current.newsletter, ...newsletter }
      const newsletterJson = JSON.stringify(merged)
      await db
        .insert(siteSettings)
        .values({ key: 'newsletter_config', value: newsletterJson, updated_at: now })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: newsletterJson, updated_at: now } })
    }

    if (telegram !== undefined) {
      const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'telegram_config'))
        .limit(1)
      const existing = rows.length > 0 && rows[0].value
        ? JSON.parse(rows[0].value)
        : { bot_token: '', allowed_chat_ids: '' }
      const merged = { ...existing, ...telegram }
      const telegramJson = JSON.stringify(merged)
      await db
        .insert(siteSettings)
        .values({ key: 'telegram_config', value: telegramJson, updated_at: now })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: telegramJson, updated_at: now },
        })
    }

    const current = await getSettings()
    return NextResponse.json(current)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const code = (err as Record<string, unknown>)?.code
    console.error('[settings PUT] error msg:', msg, 'code:', code)
    return NextResponse.json({ error: 'Erro interno do servidor', detail: msg }, { status: 500 })
  }
}
