import { cache } from 'react'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'

// ────────────────────────────────────────────────
// SEO & descoberta por IA (GEO/AEO)
// ────────────────────────────────────────────────

export interface SeoSettings {
  /** Autor padrão exibido em artigos sem autor próprio (article:author, JSON-LD) */
  default_author: string
  /** Imagem Open Graph padrão para páginas sem capa própria */
  default_og_image: string
  /** Handle do Twitter/X (ex: @minhaempresa) para Twitter Cards */
  twitter_handle: string
  /** Token de verificação do Google Search Console (meta google-site-verification) */
  google_site_verification: string
  /** Permitir que crawlers de IA (GPTBot, ClaudeBot, etc.) acessem o conteúdo */
  allow_ai_crawlers: boolean
}

export const DEFAULT_SEO: SeoSettings = {
  default_author: '',
  default_og_image: '',
  twitter_handle: '',
  google_site_verification: '',
  allow_ai_crawlers: true,
}

/**
 * User agents dos principais crawlers de IA generativa.
 * Quando `allow_ai_crawlers` é true, são liberados explicitamente no robots.txt;
 * quando false, recebem `disallow: '/'`.
 */
export const AI_CRAWLER_USER_AGENTS = [
  'GPTBot', // OpenAI (treino)
  'OAI-SearchBot', // OpenAI (ChatGPT Search)
  'ChatGPT-User', // OpenAI (navegação a pedido do usuário)
  'ClaudeBot', // Anthropic (treino)
  'Claude-User', // Anthropic (navegação a pedido do usuário)
  'anthropic-ai', // Anthropic (legado)
  'PerplexityBot', // Perplexity (indexação)
  'Perplexity-User', // Perplexity (navegação a pedido do usuário)
  'Google-Extended', // Google Gemini / Vertex AI
  'Applebot-Extended', // Apple Intelligence
  'CCBot', // Common Crawl (base de muitos LLMs)
  'Bytespider', // ByteDance
  'Amazonbot', // Amazon
  'Meta-ExternalAgent', // Meta AI
  'cohere-ai', // Cohere
]

export const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  try {
    const rows = await db.select().from(siteSettings)
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))

    return {
      default_author: map['seo_default_author'] ?? DEFAULT_SEO.default_author,
      default_og_image: map['seo_default_og_image'] ?? DEFAULT_SEO.default_og_image,
      twitter_handle: map['seo_twitter_handle'] ?? DEFAULT_SEO.twitter_handle,
      google_site_verification:
        map['seo_google_site_verification'] ?? DEFAULT_SEO.google_site_verification,
      // default true: só bloqueia se explicitamente salvo como 'false'
      allow_ai_crawlers: map['seo_allow_ai_crawlers'] !== 'false',
    }
  } catch {
    return { ...DEFAULT_SEO }
  }
})
