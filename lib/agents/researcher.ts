// lib/agents/researcher.ts
import * as cheerio from 'cheerio'
import { callOpenRouter } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { AgentContext, AgentResult } from '@/lib/agents/types'

async function duckDuckGoSearch(query: string): Promise<string[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)',
        Accept: 'text/html',
      },
    })
    if (!res.ok) return []
    const html = await res.text()
    const $ = cheerio.load(html)
    const links: string[] = []
    $('a.result__url, a[href*="uddg="]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      const match = href.match(/uddg=([^&]+)/)
      if (match) {
        try {
          const decoded = decodeURIComponent(match[1])
          if (decoded.startsWith('http') && !decoded.includes('duckduckgo.com')) {
            links.push(decoded)
          }
        } catch {}
      }
    })
    return links.slice(0, 5)
  } catch {
    return []
  }
}

export async function runResearcherAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.headline) return { success: false, message: 'Headline não disponível', error: 'NO_HEADLINE' }

  const config = await getAgentConfig('researcher')

  const resp = await callOpenRouter(
    {
      model: config.model,
      messages: [
        { role: 'system', content: config.prompt },
        { role: 'user', content: `Título do artigo: ${ctx.headline}` },
      ],
      temperature: 0.5,
      max_tokens: 400,
    },
    apiKey
  )

  let queries: string[] = []
  try {
    const cleaned = resp.choices[0]?.message?.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() ?? ''
    const parsed = JSON.parse(cleaned) as { queries?: string[] }
    queries = (parsed.queries ?? []).slice(0, 6)
  } catch {
    queries = [ctx.headline]
  }

  // Seed with any links already provided (e.g. from URL-based generation)
  const allLinks: string[] = [...(ctx.researchLinks ?? [])]
  for (const q of queries) {
    const links = await duckDuckGoSearch(q)
    for (const l of links) {
      if (!allLinks.includes(l)) allLinks.push(l)
    }
    if (allLinks.length >= 10) break
  }

  const researchLinks = allLinks.slice(0, 8)

  return {
    success: true,
    message: `${researchLinks.length} links encontrados`,
    data: { researchLinks },
  }
}
