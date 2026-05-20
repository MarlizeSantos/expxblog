import { cache } from 'react'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'

export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
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

export interface SiteSettings {
  template: string
  colors: ThemeColors
  company: CompanyInfo
  newsletter: NewsletterConfig
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

    return { template, colors, company, newsletter }
  } catch {
    return { template: 'default', colors: defaultColors('default'), company: DEFAULT_COMPANY, newsletter: DEFAULT_NEWSLETTER }
  }
})
