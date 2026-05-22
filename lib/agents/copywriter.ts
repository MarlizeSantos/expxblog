// lib/agents/copywriter.ts
import { callOpenRouter } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { getArticleConfig, buildArticleConfigPromptSection } from '@/lib/article-config'
import { AgentContext, AgentResult } from '@/lib/agents/types'

export async function runCopywriterAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.headline) return { success: false, message: 'Headline não disponível', error: 'NO_HEADLINE' }

  const config = await getAgentConfig('copywriter')
  const articleConfig = await getArticleConfig()
  const configSection = buildArticleConfigPromptSection(articleConfig)

  const sourcesBlock =
    ctx.sourceSummaries && ctx.sourceSummaries.length > 0
      ? `\n\nFONTES PESQUISADAS:\n${ctx.sourceSummaries
          .map((s, i) => `[${i + 1}] ${s.url}\n${s.summary}`)
          .join('\n\n')}`
      : ''

  const briefingBlock = ctx.briefing
    ? `\n\nCONTEXTO DA EMPRESA:\n${ctx.briefing.slice(0, 4000)}`
    : ''

  const userMsg = `Título: ${ctx.headline}
Tema original: ${ctx.themeTitle ?? ctx.headline}${ctx.themeDescription ? `\nDescrição: ${ctx.themeDescription}` : ''}
${briefingBlock}
${configSection}
${sourcesBlock}

Mínimo de ${articleConfig.minWords} palavras. Responda em JSON (sem markdown): { "title": "...", "excerpt": "...", "content": "HTML completo" }`

  const resp = await callOpenRouter(
    {
      model: config.model,
      messages: [
        { role: 'system', content: config.prompt },
        { role: 'user', content: userMsg },
      ],
      temperature: articleConfig.creativity,
      max_tokens: 6000,
    },
    apiKey
  )

  let parsed: { title: string; excerpt: string; content: string }
  try {
    const raw = resp.choices[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return { success: false, message: 'Erro ao parsear resposta do copywriter', error: 'PARSE_ERROR' }
  }

  return {
    success: true,
    message: `Artigo redigido: "${parsed.title}"`,
    data: {
      articleTitle: parsed.title,
      articleExcerpt: parsed.excerpt,
      articleContent: parsed.content,
      reviewCycles: 0,
    },
  }
}

// Called during the reviewer feedback loop — applies specific corrections to existing content
export async function runCopywriterRevision(
  ctx: AgentContext,
  issues: string[],
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.articleContent) return { success: false, message: 'Artigo não disponível', error: 'NO_CONTENT' }

  const config = await getAgentConfig('copywriter')
  const articleConfig = await getArticleConfig()

  const issueList = issues.map((i, n) => `${n + 1}. ${i}`).join('\n')

  const userMsg = `Você receberá um artigo HTML que precisa de correções específicas. Aplique APENAS as correções listadas abaixo sem alterar o restante do artigo.

PROBLEMAS A CORRIGIR:
${issueList}

TÍTULO ATUAL: ${ctx.articleTitle ?? ''}
EXCERPT ATUAL: ${ctx.articleExcerpt ?? ''}

ARTIGO ATUAL (HTML):
${ctx.articleContent.slice(0, 10000)}

Responda SOMENTE com JSON válido (sem markdown, sem texto fora do JSON):
{"title":"<título>","excerpt":"<excerpt>","content":"<HTML corrigido>"}`

  const resp = await callOpenRouter(
    {
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'Você é um editor preciso. Recebe um artigo HTML e uma lista de problemas específicos. Corrija APENAS os problemas indicados, preservando todo o restante do conteúdo, estrutura e estilo. Responda em JSON válido sem nenhum texto fora do JSON.',
        },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    },
    apiKey
  )

  let parsed: { title: string; excerpt: string; content: string }
  try {
    const raw = resp.choices[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return { success: false, message: 'Erro ao parsear revisão do copywriter', error: 'PARSE_ERROR' }
  }

  return {
    success: true,
    message: 'Artigo corrigido',
    data: {
      articleTitle: parsed.title,
      articleExcerpt: parsed.excerpt,
      articleContent: parsed.content,
    },
  }
}
