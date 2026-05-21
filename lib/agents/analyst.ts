// lib/agents/analyst.ts
import * as cheerio from 'cheerio'
import { callOpenRouter } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { AgentContext, AgentResult } from '@/lib/agents/types'

async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    const $ = cheerio.load(html)
    $('script, style, nav, footer, header, aside, [role="navigation"]').remove()
    const text = $('article, main, .content, .post-content, body')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, 6000)
  } catch {
    return ''
  }
}

export async function runAnalystAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.researchLinks || ctx.researchLinks.length === 0) {
    return { success: false, message: 'Nenhum link para analisar', error: 'NO_LINKS' }
  }

  const config = await getAgentConfig('analyst')
  const summaries: { url: string; summary: string }[] = []

  for (const url of ctx.researchLinks.slice(0, 6)) {
    const text = await extractTextFromUrl(url)
    if (!text || text.length < 200) continue

    try {
      const resp = await callOpenRouter(
        {
          model: config.model,
          messages: [
            { role: 'system', content: config.prompt },
            {
              role: 'user',
              content: `Título do artigo: ${ctx.headline ?? ''}\n\nURL: ${url}\n\nConteúdo:\n${text}`,
            },
          ],
          temperature: 0.4,
          max_tokens: 600,
        },
        apiKey
      )
      const summary = resp.choices[0]?.message?.content?.trim() ?? ''
      if (summary.length > 50) summaries.push({ url, summary })
    } catch {}
  }

  if (summaries.length === 0) {
    return {
      success: true,
      message: 'Nenhuma fonte acessível, continuando sem resumos',
      data: { sourceSummaries: [] },
    }
  }

  return {
    success: true,
    message: `${summaries.length} fontes analisadas`,
    data: { sourceSummaries: summaries },
  }
}
