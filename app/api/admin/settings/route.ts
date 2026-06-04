import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db, reconnectDb } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { getSettings, getLgpdSettings } from '@/lib/settings'
import { applyDbMode } from '@/lib/db-connection'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use formato #RRGGBB)')

const putSchema = z.object({
  template: z.enum(['default', 'portal', 'business', 'news', 'tech', 'minimal', 'magazine', 'dark-aurora', 'editorial', 'saas', 'lifestyle', 'brutalist']).optional(),
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
  resend: z
    .object({
      api_key: z.string().optional(),
      from_email: z.string().email('E-mail remetente inválido').or(z.literal('')).optional(),
      auto_send: z.boolean().optional(),
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
  chat_assistant: z
    .object({
      system_prompt: z.string().max(5000).optional(),
      enabled_tools: z.boolean().optional(),
    })
    .optional(),
  lgpd: z
    .object({
      dpo_name: z.string().max(150).optional(),
      dpo_email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
      controller_name: z.string().max(150).optional(),
      controller_cnpj: z.string().max(20).optional(),
      retention_pageviews_months: z.number().int().positive().optional(),
      retention_logs_months: z.number().int().positive().optional(),
      retention_unsubscribed_days: z.number().int().positive().optional(),
      consent_text: z.string().max(500).optional(),
      consent_version: z.string().max(50).optional(),
    })
    .optional(),
  adsense: z
    .object({
      enabled: z.boolean().optional(),
      publisher_id: z
        .string()
        .regex(/^(ca-pub-\d{10,})?$/, 'Publisher ID inválido (use formato ca-pub-XXXXXXXXXX)')
        .optional(),
    })
    .optional(),
  facebook_pixel: z
    .object({
      enabled: z.boolean().optional(),
      pixel_ids: z
        .array(z.string().regex(/^\d+$/, 'Pixel ID deve conter apenas dígitos'))
        .optional(),
      track_pageview: z.boolean().optional(),
      track_viewcontent: z.boolean().optional(),
      track_lead: z.boolean().optional(),
    })
    .optional(),
  seo: z
    .object({
      default_author: z.string().max(150).optional(),
      default_og_image: z.string().max(500).optional(),
      twitter_handle: z.string().max(50).optional(),
      google_site_verification: z.string().max(200).optional(),
      allow_ai_crawlers: z.boolean().optional(),
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

    const { template, colors, company, ai, newsletter, telegram, firecrawl, pexels, resend, database, lgpd, chat_assistant, adsense, facebook_pixel, seo } = parsed.data

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

    if (resend !== undefined) {
      if (resend.api_key !== undefined) {
        await upsertSetting('resend_api_key', resend.api_key)
      }
      if (resend.from_email !== undefined) {
        await upsertSetting('newsletter_from_email', resend.from_email)
      }
      if (resend.auto_send !== undefined) {
        await upsertSetting('newsletter_auto_send', resend.auto_send ? 'true' : 'false')
      }
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

    if (lgpd !== undefined) {
      const lgpdCurrent = await getLgpdSettings()
      const lgpdMerged = { ...lgpdCurrent, ...lgpd }
      if (lgpdMerged.dpo_name !== undefined) await upsertSetting('lgpd_dpo_name', lgpdMerged.dpo_name)
      if (lgpdMerged.dpo_email !== undefined) await upsertSetting('lgpd_dpo_email', lgpdMerged.dpo_email)
      if (lgpdMerged.controller_name !== undefined) await upsertSetting('lgpd_controller_name', lgpdMerged.controller_name)
      if (lgpdMerged.controller_cnpj !== undefined) await upsertSetting('lgpd_controller_cnpj', lgpdMerged.controller_cnpj)
      if (lgpdMerged.retention_pageviews_months !== undefined) await upsertSetting('lgpd_retention_pageviews_months', String(lgpdMerged.retention_pageviews_months))
      if (lgpdMerged.retention_logs_months !== undefined) await upsertSetting('lgpd_retention_logs_months', String(lgpdMerged.retention_logs_months))
      if (lgpdMerged.retention_unsubscribed_days !== undefined) await upsertSetting('lgpd_retention_unsubscribed_days', String(lgpdMerged.retention_unsubscribed_days))
      if (lgpdMerged.consent_text !== undefined) await upsertSetting('lgpd_consent_text', lgpdMerged.consent_text)
      if (lgpdMerged.consent_version !== undefined) await upsertSetting('lgpd_consent_version', lgpdMerged.consent_version)
    }

    if (chat_assistant !== undefined) {
      const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'chat_assistant_config'))
        .limit(1)
      const existing = rows.length > 0 && rows[0].value
        ? JSON.parse(rows[0].value)
        : { system_prompt: '', enabled_tools: true }
      const merged = { ...existing, ...chat_assistant }
      await upsertSetting('chat_assistant_config', JSON.stringify(merged))
    }

    if (adsense !== undefined) {
      if (adsense.enabled !== undefined) {
        await upsertSetting('adsense_enabled', adsense.enabled ? 'true' : 'false')
      }
      if (adsense.publisher_id !== undefined) {
        await upsertSetting('adsense_publisher_id', adsense.publisher_id)
      }
    }

    if (facebook_pixel !== undefined) {
      const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'facebook_pixel_config'))
        .limit(1)
      const existing =
        rows.length > 0 && rows[0].value
          ? JSON.parse(rows[0].value)
          : { enabled: false, pixel_ids: [], track_pageview: true, track_viewcontent: true, track_lead: true }
      const merged = { ...existing, ...facebook_pixel }
      await upsertSetting('facebook_pixel_config', JSON.stringify(merged))
    }

    if (seo !== undefined) {
      if (seo.default_author !== undefined) await upsertSetting('seo_default_author', seo.default_author)
      if (seo.default_og_image !== undefined) await upsertSetting('seo_default_og_image', seo.default_og_image)
      if (seo.twitter_handle !== undefined) await upsertSetting('seo_twitter_handle', seo.twitter_handle)
      if (seo.google_site_verification !== undefined) await upsertSetting('seo_google_site_verification', seo.google_site_verification)
      if (seo.allow_ai_crawlers !== undefined) await upsertSetting('seo_allow_ai_crawlers', seo.allow_ai_crawlers ? 'true' : 'false')
    }

    const current = await getSettings()
    return NextResponse.json(current)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[settings PUT]', msg)
    return NextResponse.json({ error: msg || 'Erro interno do servidor' }, { status: 500 })
  }
}
