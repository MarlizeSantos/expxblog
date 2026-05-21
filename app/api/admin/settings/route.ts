import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { getSettings } from '@/lib/settings'
import { eq, sql } from 'drizzle-orm'

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

async function upsertSetting(key: string, value: string) {
  await db.execute(
    sql`INSERT INTO site_settings (key, value, updated_at)
        VALUES (${key}, ${value}, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
  )
}

export async function GET() {
  try {
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (err) {
    console.error('[settings GET]', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const parsed = putSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { template, colors, company, ai, newsletter, telegram } = parsed.data

    if (template !== undefined) {
      await upsertSetting('active_template', template)
    }

    if (colors !== undefined) {
      await upsertSetting('theme_colors', JSON.stringify(colors))
    }

    if (company !== undefined) {
      const current = await getSettings()
      const merged = { ...current.company, ...company }
      await upsertSetting('company_info', JSON.stringify(merged))
    }

    if (ai !== undefined) {
      if (ai.api_key !== undefined) {
        await upsertSetting('ai_api_key', ai.api_key)
      }
      if (ai.models !== undefined) {
        await upsertSetting('ai_models', JSON.stringify(ai.models))
      }
    }

    if (newsletter !== undefined) {
      const current = await getSettings()
      const merged = { ...current.newsletter, ...newsletter }
      await upsertSetting('newsletter_config', JSON.stringify(merged))
    }

    if (telegram !== undefined) {
      const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'telegram_config'))
        .limit(1)
      const existing =
        rows.length > 0 && rows[0].value
          ? JSON.parse(rows[0].value)
          : { bot_token: '', allowed_chat_ids: '' }
      await upsertSetting('telegram_config', JSON.stringify({ ...existing, ...telegram }))
    }

    const current = await getSettings()
    return NextResponse.json(current)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[settings PUT]', msg)
    return NextResponse.json({ error: msg || 'Erro interno do servidor' }, { status: 500 })
  }
}
