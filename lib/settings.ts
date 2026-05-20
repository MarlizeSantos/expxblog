import { cache } from 'react'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'

export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
}

export interface SiteSettings {
  template: string
  colors: ThemeColors
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

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await db.select().from(siteSettings)
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

    const template = map['active_template'] ?? 'default'
    const storedColors = map['theme_colors'] ? (JSON.parse(map['theme_colors']) as Partial<ThemeColors>) : {}
    const colors: ThemeColors = { ...defaultColors(template), ...storedColors }

    return { template, colors }
  } catch {
    return { template: 'default', colors: defaultColors('default') }
  }
})
