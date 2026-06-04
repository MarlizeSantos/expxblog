import { db } from '@/drizzle/db'
import { posts } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import { getSettings } from '@/lib/settings'
import { getAppUrl } from '@/lib/app-url'

export const dynamic = 'force-dynamic'

/**
 * /llms.txt — índice do conteúdo no formato llmstxt.org, otimizado para
 * crawlers de IA (ChatGPT, Perplexity, Claude, Gemini). Markdown limpo com
 * título, resumo e a lista dos artigos publicados mais recentes.
 */
export async function GET() {
  try {
    const baseUrl = getAppUrl()
    const { company } = await getSettings()
    const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
    const blogDescription =
      company.blog_description || `${blogName} — artigos sobre tecnologia, gestão e inovação.`

    const postRows = await db
      .select({
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
      })
      .from(posts)
      .where(eq(posts.status, 'published'))
      .orderBy(desc(posts.published_at))
      .limit(200)

    const lines: string[] = [
      `# ${blogName}`,
      '',
      `> ${blogDescription.replace(/\s+/g, ' ').trim()}`,
      '',
      'Este arquivo lista o conteúdo publicado para facilitar a leitura e a citação por assistentes de IA.',
      '',
      '## Artigos',
      '',
    ]

    for (const post of postRows) {
      const url = `${baseUrl}/${post.slug}`
      const summary = (post.excerpt || '').replace(/\s+/g, ' ').trim()
      lines.push(summary ? `- [${post.title}](${url}): ${summary}` : `- [${post.title}](${url})`)
    }

    lines.push('', '## Recursos', '', `- [Feed RSS](${baseUrl}/feed.xml): feed completo dos artigos`, '')

    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    })
  } catch (err) {
    console.error('[/llms.txt]', err)
    return new Response('Error generating llms.txt', { status: 500 })
  }
}
