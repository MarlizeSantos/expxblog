// lib/agents/headline.ts
import { db } from '@/drizzle/db'
import { articleThemes, siteSettings } from '@/drizzle/schema'
import { eq, and, inArray, asc } from 'drizzle-orm'
import { callOpenRouter } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { AgentContext, AgentResult } from '@/lib/agents/types'

export async function runHeadlineAgent(
  ctx: AgentContext,
  themeIds: number[],
  apiKey: string,
  log?: (msg: string) => void
): Promise<AgentResult> {
  let themeId: number | undefined
  let themeTitle: string
  let themeDescription: string | null | undefined

  if (ctx.themeTitle) {
    // Theme data already in context — skip DB query
    log?.('tema disponível no contexto, pulando busca no banco...')
    themeTitle = ctx.themeTitle
    themeDescription = ctx.themeDescription
    themeId = ctx.themeId
  } else {
    log?.('buscando tema no banco...')
    let rows
    if (themeIds.length > 0) {
      rows = await db
        .select()
        .from(articleThemes)
        .where(and(inArray(articleThemes.id, themeIds), eq(articleThemes.status, 'pending')))
        .orderBy(asc(articleThemes.created_at))
        .limit(1)
    } else {
      rows = await db
        .select()
        .from(articleThemes)
        .where(eq(articleThemes.status, 'pending'))
        .orderBy(asc(articleThemes.created_at))
        .limit(1)
    }

    if (rows.length === 0) {
      return { success: false, message: 'Nenhum tema pendente disponível', error: 'NO_THEME' }
    }

    themeId = rows[0].id
    themeTitle = rows[0].title
    themeDescription = rows[0].description
  }

  log?.(`tema: "${themeTitle}" — carregando config do agente...`)
  const config = await getAgentConfig('headline')

  // Load briefing
  log?.('carregando briefing...')
  let briefing = ctx.briefing ?? ''
  if (!briefing) {
    try {
      const bRows = await db.select().from(siteSettings).where(eq(siteSettings.key, 'briefing_content')).limit(1)
      briefing = bRows[0]?.value ?? ''
    } catch {}
  }

  const userMsg = `Tema: ${themeTitle}${themeDescription ? `\nDescrição: ${themeDescription}` : ''}${briefing ? `\n\nContexto da empresa:\n${briefing.slice(0, 2000)}` : ''}`

  log?.('chamando OpenRouter...')
  const resp = await callOpenRouter(
    {
      model: config.model,
      messages: [
        { role: 'system', content: config.prompt },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.8,
      max_tokens: 120,
    },
    apiKey
  )

  const headline = resp.choices[0]?.message?.content?.trim() ?? themeTitle

  return {
    success: true,
    message: `Headline gerada: "${headline}"`,
    data: {
      themeId,
      themeTitle,
      themeDescription,
      briefing,
      headline,
    },
  }
}
