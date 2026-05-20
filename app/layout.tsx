import type { Metadata } from 'next'
import './globals.css'
import { getSettings, darkenHex, lightenHex } from '@/lib/settings'

export const metadata: Metadata = {
  title: {
    template: '%s | MMA Sistemas Blog',
    default: 'MMA Sistemas Blog',
  },
  description: 'Tecnologia, gestão e inovação para empresas',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { template, colors } = await getSettings()

  const cssVars = `:root{` +
    `--color-primary:${colors.primary};` +
    `--color-primary-dark:${darkenHex(colors.primary)};` +
    `--color-primary-light:${lightenHex(colors.primary)};` +
    `--color-secondary:${colors.secondary};` +
    `--color-secondary-dark:${darkenHex(colors.secondary)};` +
    `--color-secondary-light:${lightenHex(colors.secondary)};` +
    `--color-bg:${colors.background};` +
    `--color-surface:${colors.surface};` +
    `}`

  return (
    <html lang="pt-BR">
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      </head>
      <body
        className="text-neutral-900 antialiased"
        style={{ backgroundColor: 'var(--color-bg)' }}
        data-template={template}
      >
        {children}
      </body>
    </html>
  )
}
