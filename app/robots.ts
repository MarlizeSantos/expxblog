import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/app-url'
import { getSeoSettings, AI_CRAWLER_USER_AGENTS } from '@/lib/seo'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeoSettings()

  const rules: MetadataRoute.Robots['rules'] = [
    { userAgent: '*', allow: '/', disallow: '/admin' },
  ]

  // Quando o usuário opta por bloquear IA, cada crawler de IA recebe disallow total.
  // Quando libera (padrão), eles seguem a regra '*' acima — sem necessidade de listar.
  if (!seo.allow_ai_crawlers) {
    rules.push({ userAgent: AI_CRAWLER_USER_AGENTS, disallow: '/' })
  }

  return {
    rules,
    sitemap: `${getAppUrl()}/sitemap.xml`,
  }
}
