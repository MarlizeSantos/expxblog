import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db, reconnectDb } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { getSettings } from '@/lib/settings'
import { applyDbMode } from '@/lib/db-connection'
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
  firecrawl: z
    .object({
      api_key: z.string().optional(),
    })
    .optional(),
  pexels: z
    .object({
      api_key: z.string().optional(),
    })
    .optional(),
  design_system: z
    .object({
      font_sans: z.string().max(200).optional(),
      font_serif: z.string().max(200).optional(),
      font_mono: z.string().max(200).optional(),
      font_size_base: z.string().max(20).optional(),
      font_size_sm: z.string().max(20).optional(),
      font_size_lg: z.string().max(20).optional(),
      font_size_xl: z.string().max(20).optional(),
      font_size_2xl: z.string().max(20).optional(),
      font_size_3xl: z.string().max(20).optional(),
      line_height_base: z.string().max(20).optional(),
      font_weight_normal: z.string().max(10).optional(),
      font_weight_medium: z.string().max(10).optional(),
      font_weight_bold: z.string().max(10).optional(),
      spacing_base: z.string().max(20).optional(),
      radius_sm: z.string().max(20).optional(),
      radius_md: z.string().max(20).optional(),
      radius_lg: z.string().max(20).optional(),
      radius_full: z.string().max(20).optional(),
      color_text_primary: hexColor.optional(),
      color_text_secondary: hexColor.optional(),
      color_border: hexColor.optional(),
      color_error: hexColor.optional(),
      color_success: hexColor.optional(),
      color_warning: hexColor.optional(),
    })
    .optional(),
  database: z
    .object({
      url: z
        .string()
        .refine(
          (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
          { message: 'URL deve começar com postgresql:// ou postgres://' }
        )
        .optional(),
      // Modo de conexão: reescreve a porta da URL (session=5432, transaction=6543, direct=5432).
      mode: z.enum(['session', 'transaction', 'direct']).optional(),
    })
    .optional(),
})

async function upsertSetting(key: string, value: string) {
  const existing = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(siteSettings)
      .set({ value, updated_at: new Date() })
      .where(eq(siteSettings.key, key))
  } else {
    await db
      .insert(siteSettings)
      .values({ key, value, updated_at: new Date() })
  }
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

    const { template, colors, company, ai, newsletter, telegram, firecrawl, pexels, database } = parsed.data

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

    if (parsed.data.design_system !== undefined) {
      const current = await getSettings()
      const merged = { ...current.design_system, ...parsed.data.design_system }
      await upsertSetting('design_system', JSON.stringify(merged))
    }

    if (firecrawl?.api_key !== undefined) {
      await upsertSetting('firecrawl_api_key', firecrawl.api_key)
    }

    if (pexels?.api_key !== undefined) {
      await upsertSetting('pexels_api_key', pexels.api_key)
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

    if (database !== undefined && (database.url !== undefined || database.mode !== undefined)) {
      // URL base: a nova fornecida, senão a já salva, senão a env var.
      let nextUrl = database.url
      if (nextUrl === undefined) {
        const rows = await db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.key, 'database_url'))
          .limit(1)
        nextUrl = (rows.length > 0 && rows[0].value) || process.env.DATABASE_URL || ''
      }

      if (!nextUrl) {
        return NextResponse.json(
          { error: 'Nenhuma DATABASE_URL configurada para aplicar o modo' },
          { status: 400 }
        )
      }

      // Se o modo foi informado, reescreve a porta da URL conforme o modo.
      if (database.mode !== undefined) {
        try {
          nextUrl = applyDbMode(nextUrl, database.mode)
        } catch {
          return NextResponse.json({ error: 'URL de banco inválida' }, { status: 400 })
        }
      }

      await upsertSetting('database_url', nextUrl)
      // Reconecta o pool em memória para queries subsequentes nesta instância
      // (o max do pool é derivado da porta/modo da nova URL).
      reconnectDb(nextUrl)
    }

    const current = await getSettings()
    return NextResponse.json(current)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[settings PUT]', msg)
    return NextResponse.json({ error: msg || 'Erro interno do servidor' }, { status: 500 })
  }
}
