import { cache } from 'react'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'

export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
}

export interface DesignSystem {
  font_sans: string
  font_serif: string
  font_mono: string
  font_size_base: string
  font_size_sm: string
  font_size_lg: string
  font_size_xl: string
  font_size_2xl: string
  font_size_3xl: string
  line_height_base: string
  font_weight_normal: string
  font_weight_medium: string
  font_weight_bold: string
  spacing_base: string
  radius_sm: string
  radius_md: string
  radius_lg: string
  radius_full: string
  color_text_primary: string
  color_text_secondary: string
  color_border: string
  color_error: string
  color_success: string
  color_warning: string
}

export const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
  font_sans: 'Inter, system-ui, sans-serif',
  font_serif: '"Source Serif 4", Georgia, serif',
  font_mono: '"JetBrains Mono", monospace',
  font_size_base: '16px',
  font_size_sm: '14px',
  font_size_lg: '18px',
  font_size_xl: '20px',
  font_size_2xl: '24px',
  font_size_3xl: '30px',
  line_height_base: '1.75',
  font_weight_normal: '400',
  font_weight_medium: '500',
  font_weight_bold: '700',
  spacing_base: '4px',
  radius_sm: '4px',
  radius_md: '8px',
  radius_lg: '12px',
  radius_full: '9999px',
  color_text_primary: '#1A1A2E',
  color_text_secondary: '#4B5563',
  color_border: '#E5E7EB',
  color_error: '#DC2626',
  color_success: '#16A34A',
  color_warning: '#D97706',
}

export interface CompanyInfo {
  logo_url: string
  blog_name: string
  blog_description: string
  company_name: string
  company_email: string
  company_phone: string
  company_address: string
  company_cnpj: string
  social_facebook: string
  social_instagram: string
  social_twitter: string
  social_youtube: string
}

export interface NewsletterConfig {
  enabled: boolean
  title: string
  subtitle: string
}

export const DEFAULT_NEWSLETTER: NewsletterConfig = {
  enabled: false,
  title: 'Fique por dentro das novidades',
  subtitle: 'Receba os melhores artigos diretamente no seu e-mail.',
}

export interface ResendSettings {
  api_key: string
  from_email: string
  auto_send: boolean
}

export const DEFAULT_RESEND: ResendSettings = {
  api_key: '',
  from_email: '',
  auto_send: false,
}

// ────────────────────────────────────────────────
// Facebook Pixel config
// ────────────────────────────────────────────────

export interface FacebookPixelConfig {
  enabled: boolean
  pixel_ids: string[]
  track_pageview: boolean
  track_viewcontent: boolean
  track_lead: boolean
}

export const DEFAULT_FACEBOOK_PIXEL: FacebookPixelConfig = {
  enabled: false,
  pixel_ids: [],
  track_pageview: true,
  track_viewcontent: true,
  track_lead: true,
}

export interface SiteSettings {
  template: string
  colors: ThemeColors
  company: CompanyInfo
  newsletter: NewsletterConfig
  resend: ResendSettings
  design_system: DesignSystem
  facebook_pixel: FacebookPixelConfig
}

const COLOR_DEFAULTS: Record<string, ThemeColors> = {
  default: {
    primary: '#1A4FA0',
    secondary: '#F58A2D',
    background: '#F9FAFB',
    surface: '#FFFFFF',
  },
  portal: {
    primary: '#CC0000',
    secondary: '#FF6600',
    background: '#F5F5F5',
    surface: '#FFFFFF',
  },
  business: {
    primary: '#0D1B4B',
    secondary: '#FF6B35',
    background: '#F7F8FA',
    surface: '#FFFFFF',
  },
  news: {
    primary: '#003580',
    secondary: '#E8002D',
    background: '#F2F2F2',
    surface: '#FFFFFF',
  },
  tech: {
    primary: '#111111',
    secondary: '#00B140',
    background: '#F4F4F4',
    surface: '#FFFFFF',
  },
  minimal: {
    primary: '#111111',
    secondary: '#6B7280',
    background: '#FFFFFF',
    surface: '#FFFFFF',
  },
  magazine: {
    primary: '#1A1A1A',
    secondary: '#C8102E',
    background: '#F8F5F0',
    surface: '#FFFFFF',
  },
  'dark-aurora': {
    primary: '#8B5CF6',
    secondary: '#22D3EE',
    background: '#0B0F1A',
    surface: '#141824',
  },
}

export function defaultColors(template: string): ThemeColors {
  return COLOR_DEFAULTS[template] ?? COLOR_DEFAULTS.default
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function darkenHex(hex: string, factor = 0.2): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor))
}

export function lightenHex(hex: string, factor = 0.9): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor)
}

export const DEFAULT_COMPANY: CompanyInfo = {
  logo_url: '',
  blog_name: '',
  blog_description: '',
  company_name: '',
  company_email: '',
  company_phone: '',
  company_address: '',
  company_cnpj: '',
  social_facebook: '',
  social_instagram: '',
  social_twitter: '',
  social_youtube: '',
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await db.select().from(siteSettings)
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

    const template = map['active_template'] ?? 'default'
    const storedColors = map['theme_colors'] ? (JSON.parse(map['theme_colors']) as Partial<ThemeColors>) : {}
    const colors: ThemeColors = { ...defaultColors(template), ...storedColors }

    const storedCompany = map['company_info'] ? (JSON.parse(map['company_info']) as Partial<CompanyInfo>) : {}
    const company: CompanyInfo = { ...DEFAULT_COMPANY, ...storedCompany }

    const storedNewsletter = map['newsletter_config'] ? (JSON.parse(map['newsletter_config']) as Partial<NewsletterConfig>) : {}
    const newsletter: NewsletterConfig = { ...DEFAULT_NEWSLETTER, ...storedNewsletter }

    const storedDS = map['design_system'] ? (JSON.parse(map['design_system']) as Partial<DesignSystem>) : {}
    const design_system: DesignSystem = { ...DEFAULT_DESIGN_SYSTEM, ...storedDS }

    const resend: ResendSettings = {
      api_key: map['resend_api_key'] ?? '',
      from_email: map['newsletter_from_email'] ?? '',
      auto_send: map['newsletter_auto_send'] === 'true',
    }

    const storedFbPixel = map['facebook_pixel_config'] ? (JSON.parse(map['facebook_pixel_config']) as Partial<FacebookPixelConfig>) : {}
    const facebook_pixel: FacebookPixelConfig = { ...DEFAULT_FACEBOOK_PIXEL, ...storedFbPixel }

    return { template, colors, company, newsletter, resend, design_system, facebook_pixel }
  } catch {
    return { template: 'default', colors: defaultColors('default'), company: DEFAULT_COMPANY, newsletter: DEFAULT_NEWSLETTER, resend: DEFAULT_RESEND, design_system: DEFAULT_DESIGN_SYSTEM, facebook_pixel: DEFAULT_FACEBOOK_PIXEL }
  }
})


// ────────────────────────────────────────────────
// Chat assistant config
// ────────────────────────────────────────────────

export interface ChatAssistantConfig {
  system_prompt: string
  enabled_tools: boolean
}

export const DEFAULT_CHAT_ASSISTANT: ChatAssistantConfig = {
  system_prompt: '',
  enabled_tools: true,
}

export const getChatAssistantConfig = cache(async (): Promise<ChatAssistantConfig> => {
  try {
    const rows = await db.select().from(siteSettings)
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))
    if (map['chat_assistant_config']) {
      const parsed = JSON.parse(map['chat_assistant_config']) as Partial<ChatAssistantConfig>
      return {
        system_prompt: parsed.system_prompt ?? DEFAULT_CHAT_ASSISTANT.system_prompt,
        enabled_tools: parsed.enabled_tools !== false,
      }
    }
    return { ...DEFAULT_CHAT_ASSISTANT }
  } catch {
    return { ...DEFAULT_CHAT_ASSISTANT }
  }
})

// ────────────────────────────────────────────────
// LGPD settings
// ────────────────────────────────────────────────

export interface LgpdSettings {
  dpo_name: string
  dpo_email: string
  controller_name: string
  controller_cnpj: string
  retention_pageviews_months: number
  retention_logs_months: number
  retention_unsubscribed_days: number
  consent_text: string
  consent_version: string
}

export const DEFAULT_LGPD: LgpdSettings = {
  dpo_name: '',
  dpo_email: '',
  controller_name: '',
  controller_cnpj: '',
  retention_pageviews_months: 12,
  retention_logs_months: 6,
  retention_unsubscribed_days: 30,
  consent_text: 'Li e aceito a Política de Privacidade',
  consent_version: 'v1-2026-06',
}

export const getLgpdSettings = cache(async (): Promise<LgpdSettings> => {
  try {
    const rows = await db.select().from(siteSettings)
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))

    return {
      dpo_name: map['lgpd_dpo_name'] ?? DEFAULT_LGPD.dpo_name,
      dpo_email: map['lgpd_dpo_email'] ?? DEFAULT_LGPD.dpo_email,
      controller_name: map['lgpd_controller_name'] ?? DEFAULT_LGPD.controller_name,
      controller_cnpj: map['lgpd_controller_cnpj'] ?? DEFAULT_LGPD.controller_cnpj,
      retention_pageviews_months: map['lgpd_retention_pageviews_months']
        ? Number(map['lgpd_retention_pageviews_months'])
        : DEFAULT_LGPD.retention_pageviews_months,
      retention_logs_months: map['lgpd_retention_logs_months']
        ? Number(map['lgpd_retention_logs_months'])
        : DEFAULT_LGPD.retention_logs_months,
      retention_unsubscribed_days: map['lgpd_retention_unsubscribed_days']
        ? Number(map['lgpd_retention_unsubscribed_days'])
        : DEFAULT_LGPD.retention_unsubscribed_days,
      consent_text: map['lgpd_consent_text'] ?? DEFAULT_LGPD.consent_text,
      consent_version: map['lgpd_consent_version'] ?? DEFAULT_LGPD.consent_version,
    }
  } catch {
    return { ...DEFAULT_LGPD }
  }
})
