// lib/agent-pipeline.ts
import { getAIApiKey, callOpenRouter, getTextModel } from '@/lib/ai'
import { runHeadlineAgent } from '@/lib/agents/headline'
import { runResearcherAgent } from '@/lib/agents/researcher'
import { runAnalystAgent } from '@/lib/agents/analyst'
import { runCopywriterAgent, runCopywriterRevision } from '@/lib/agents/copywriter'
import { runReviewerAgent, MAX_REVIEW_CYCLES } from '@/lib/agents/reviewer'
import { runCtaAgent } from '@/lib/agents/cta'
import { runDesignerAgent } from '@/lib/agents/designer'
import { runPublisherAgent } from '@/lib/agents/publisher'
import { getAgentConfig, upsertAgentConfig } from '@/lib/agent-configs'
import { getAgentsExtra } from '@/lib/firecrawl'
import { AgentContext, AgentId, PipelineEvent, PublisherTriggers } from '@/lib/agents/types'
import { dispatchWebhookEvent } from '@/lib/webhooks'

const LEARNING_MARKER = '\n\n--- ERROS RECORRENTES (aprender a evitar) ---'
const MAX_LEARNING_ITEMS = 10

/**
 * Filters raw reviewer issues down to generic, reusable writing principles.
 * Issues tied to specific facts, data, names, dates, or topics of a single article
 * are discarded — only structural/stylistic patterns worth learning globally are kept.
 */
async function generalizeIssues(issues: string[], apiKey: string): Promise<string[]> {
  const prompt = `Você receberá uma lista de erros apontados por um revisor em um artigo específico.
Sua tarefa é filtrar e reescrever apenas os erros que representam problemas ESTRUTURAIS ou GENÉRICOS de escrita — erros que o copywriter deve evitar em QUALQUER artigo futuro, independentemente do tema.

Descarte erros que:
- Mencionam fatos, dados, números, datas, nomes, lugares ou eventos específicos do artigo
- Dependem do contexto ou tema particular do artigo para fazer sentido
- Seriam irrelevantes ou incorretos aplicados a outros temas

Mantenha e reescreva (de forma abstrata e genérica) apenas erros que indicam:
- Problemas de estrutura textual (introdução, desenvolvimento, conclusão)
- Falhas de coerência ou coesão
- Problemas de clareza, objetividade ou tom
- Uso inadequado de linguagem, jargões ou formalidade
- Ausência de elementos estruturais importantes (fontes, links, subtítulos, etc.)

Responda APENAS com um array JSON de strings. Se nenhum erro for genérico, responda com [].
Exemplo: ["Introdução não apresenta o problema central antes de entrar nos detalhes", "Conclusão não retoma os pontos principais do artigo"]

Erros para analisar:
${issues.map((i, n) => `${n + 1}. ${i}`).join('\n')}`

  try {
    const resp = await callOpenRouter(
      {
        model: await getTextModel(),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 400,
        feature: 'content_generation',
      },
      apiKey
    )
    const raw = resp.choices[0]?.message?.content ?? '[]'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

async function appendLearningToPrompt(issues: string[], apiKey: string): Promise<void> {
  if (issues.length === 0) return
  try {
    const genericIssues = await generalizeIssues(issues, apiKey)
    if (genericIssues.length === 0) return

    const config = await getAgentConfig('copywriter')
    const markerIdx = config.prompt.indexOf(LEARNING_MARKER)
    const basePrompt = markerIdx >= 0 ? config.prompt.slice(0, markerIdx) : config.prompt

    // Extract existing learned items
    const existing: string[] = markerIdx >= 0
      ? config.prompt.slice(markerIdx + LEARNING_MARKER.length).split('\n').map(s => s.replace(/^- /, '').trim()).filter(Boolean)
      : []

    // Merge, deduplicate, cap at MAX_LEARNING_ITEMS
    const merged = [...existing]
    for (const issue of genericIssues) {
      if (!merged.some(e => e.toLowerCase().includes(issue.toLowerCase().slice(0, 30)))) {
        merged.push(issue)
      }
    }
    const capped = merged.slice(-MAX_LEARNING_ITEMS)
    const newPrompt = basePrompt + LEARNING_MARKER + '\n' + capped.map(i => `- ${i}`).join('\n')
    await upsertAgentConfig('copywriter', { prompt: newPrompt })
  } catch {}
}

export interface PipelineOptions {
  themeIds: number[]
  triggers: PublisherTriggers
  initialContext?: Partial<AgentContext>
  signal?: AbortSignal
}

function makeEvent(
  type: PipelineEvent['type'],
  message: string,
  agent?: AgentId,
  data?: Record<string, unknown>
): string {
  const event: PipelineEvent = {
    type,
    agent,
    message,
    data,
    timestamp: new Date().toISOString(),
  }
  return `data: ${JSON.stringify(event)}\n\n`
}

export function createPipelineStream(options: PipelineOptions): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(new TextEncoder().encode(chunk))

      const ctx: AgentContext = { ...(options.initialContext ?? {}) }

      const aborted = () => options.signal?.aborted ?? false

      try {
        const apiKey = await getAIApiKey()
        if (!apiKey) {
          send(makeEvent('pipeline_error', 'Chave de API do OpenRouter não configurada.'))
          controller.close()
          return
        }

        // 1. Headline — skip if already provided via initialContext
        if (aborted()) { send(makeEvent('pipeline_error', 'Pipeline interrompido pelo usuário')); controller.close(); return }
        if (!ctx.headline) {
          send(makeEvent('agent_start', 'Gerando headline...', 'headline'))
          const headlineResult = await runHeadlineAgent(ctx, options.themeIds, apiKey, (msg) =>
            send(makeEvent('log', `[headline] ${msg}`))
          )
          if (!headlineResult.success) {
            send(makeEvent('agent_error', headlineResult.message, 'headline'))
            send(makeEvent('pipeline_error', headlineResult.message))
            controller.close()
            return
          }
          Object.assign(ctx, headlineResult.data)
          send(makeEvent('agent_done', headlineResult.message, 'headline', { headline: ctx.headline }))
        } else {
          send(makeEvent('agent_done', `Headline: "${ctx.headline}"`, 'headline', { headline: ctx.headline }))
        }

        // 2. Researcher — skip if pastedText provided (text is already the source)
        if (aborted()) { send(makeEvent('pipeline_error', 'Pipeline interrompido pelo usuário')); controller.close(); return }
        if (ctx.pastedText) {
          send(makeEvent('agent_done', 'Texto colado fornecido, pesquisa na web ignorada', 'researcher'))
        } else {
          send(makeEvent('agent_start', 'Pesquisando referências na web...', 'researcher'))
          const researchResult = await runResearcherAgent(ctx, apiKey)
          if (!researchResult.success) {
            send(makeEvent('agent_error', researchResult.message, 'researcher'))
            // non-fatal: continue with no links
          } else {
            Object.assign(ctx, researchResult.data)
            const msg = researchResult.error
              ? `${researchResult.message} — resposta do modelo: ${researchResult.error}`
              : researchResult.message
            send(makeEvent('agent_done', msg, 'researcher', { count: ctx.researchLinks?.length }))
          }
        }

        // 3. Analyst
        if (aborted()) { send(makeEvent('pipeline_error', 'Pipeline interrompido pelo usuário')); controller.close(); return }
        send(makeEvent('agent_start', 'Analisando fontes...', 'analyst'))
        const analystResult = await runAnalystAgent(ctx, apiKey, (msg) =>
          send(makeEvent('log', msg, 'analyst'))
        )
        Object.assign(ctx, analystResult.data ?? {})
        send(makeEvent('agent_done', analystResult.message, 'analyst', { summaries: ctx.sourceSummaries?.length }))

        // 4. Copywriter (initial draft)
        if (aborted()) { send(makeEvent('pipeline_error', 'Pipeline interrompido pelo usuário')); controller.close(); return }
        send(makeEvent('agent_start', 'Redigindo artigo...', 'copywriter'))
        const copyResult = await runCopywriterAgent(ctx, apiKey)
        if (!copyResult.success) {
          send(makeEvent('agent_error', copyResult.message, 'copywriter'))
          send(makeEvent('pipeline_error', copyResult.message))
          controller.close()
          return
        }
        Object.assign(ctx, copyResult.data)
        send(makeEvent('agent_done', copyResult.message, 'copywriter'))

        // 5. Reviewer loop (skipped if reviewer is disabled in agents_extra)
        const agentsExtra = await getAgentsExtra()
        const reviewerEnabled = agentsExtra['reviewer']?.reviewer_enabled ?? true
        ctx.reviewCycles = 0
        let reviewCycles = 0
        const persistentIssues: string[] = []
        let lastIssues: string[] = []
        if (!reviewerEnabled) {
          send(makeEvent('agent_done', 'Revisor desabilitado, pulando revisão', 'reviewer'))
        }
        while (reviewerEnabled && reviewCycles < MAX_REVIEW_CYCLES) {
          if (aborted()) { send(makeEvent('pipeline_error', 'Pipeline interrompido pelo usuário')); controller.close(); return }
          const cycle = reviewCycles + 1
          send(makeEvent('agent_start', `Revisando artigo (ciclo ${cycle})...`, 'reviewer'))
          const reviewResult = await runReviewerAgent(ctx, apiKey)

          if (reviewResult.approved) {
            send(makeEvent('agent_done', reviewResult.message, 'reviewer'))
            break
          }

          lastIssues = reviewResult.issues ?? []
          reviewCycles = cycle
          ctx.reviewCycles = reviewCycles
          send(makeEvent('agent_retry', reviewResult.message, 'reviewer', { issues: lastIssues, cycle }))

          if (reviewCycles >= MAX_REVIEW_CYCLES) {
            // Issues that persisted to the last cycle are candidates for learning
            for (const issue of lastIssues) {
              if (!persistentIssues.includes(issue)) persistentIssues.push(issue)
            }
            send(makeEvent('agent_done', 'Limite de revisões atingido, prosseguindo', 'reviewer'))
            break
          }

          // Re-run copywriter with targeted corrections only
          if (aborted()) { send(makeEvent('pipeline_error', 'Pipeline interrompido pelo usuário')); controller.close(); return }
          send(makeEvent('agent_start', `Corrigindo artigo (ciclo ${cycle})...`, 'copywriter'))
          const fixResult = await runCopywriterRevision(ctx, lastIssues, apiKey)
          if (fixResult.success) {
            Object.assign(ctx, fixResult.data)
            send(makeEvent('agent_done', 'Artigo corrigido', 'copywriter'))
          } else {
            send(makeEvent('agent_error', fixResult.message, 'copywriter'))
            break
          }
        }

        // Append persistent issues to copywriter prompt for future articles
        if (persistentIssues.length > 0) {
          await appendLearningToPrompt(persistentIssues, apiKey)
          send(makeEvent('log', `Aprendizado registrado: ${persistentIssues.length} padrão(ões) analisado(s) para o prompt do copywriter`))
        }

        // 6. CTA
        if (aborted()) { send(makeEvent('pipeline_error', 'Pipeline interrompido pelo usuário')); controller.close(); return }
        send(makeEvent('agent_start', 'Inserindo CTA...', 'cta'))
        const ctaResult = await runCtaAgent(ctx, apiKey)
        if (ctaResult.success) Object.assign(ctx, ctaResult.data)
        send(makeEvent('agent_done', ctaResult.message, 'cta'))

        // 7. Designer (pulado se desabilitado em agents_extra — ex: usuário sem Pexels)
        if (aborted()) { send(makeEvent('pipeline_error', 'Pipeline interrompido pelo usuário')); controller.close(); return }
        const designerEnabled = agentsExtra['designer']?.designer_enabled ?? true
        if (designerEnabled) {
          send(makeEvent('agent_start', 'Gerando imagem de capa...', 'designer'))
          try {
            const designResult = await runDesignerAgent(ctx, apiKey)
            if (designResult.success) Object.assign(ctx, designResult.data)
            send(makeEvent('agent_done', designResult.message, 'designer'))
          } catch (imgErr) {
            const msg = imgErr instanceof Error ? imgErr.message : String(imgErr)
            send(makeEvent('agent_error', `Imagem falhou (continuando): ${msg}`, 'designer'))
          }
        } else {
          send(makeEvent('agent_done', 'Geração de capa desabilitada — artigo sem imagem', 'designer'))
        }

        // 8. Publisher
        if (aborted()) { send(makeEvent('pipeline_error', 'Pipeline interrompido pelo usuário')); controller.close(); return }
        send(makeEvent('agent_start', 'Publicando artigo...', 'publisher'))
        const pubResult = await runPublisherAgent(ctx, options.triggers)
        if (!pubResult.success) {
          send(makeEvent('agent_error', pubResult.message, 'publisher'))
          send(makeEvent('pipeline_error', pubResult.message))
          controller.close()
          return
        }
        Object.assign(ctx, pubResult.data)
        send(makeEvent('agent_done', pubResult.message, 'publisher', { post_id: ctx.postId }))

        dispatchWebhookEvent('pipeline_completed', { status: 'success', post_id: ctx.postId })
        send(makeEvent('pipeline_done', `Pipeline concluído! Artigo ID ${ctx.postId}`, undefined, { post_id: ctx.postId }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        dispatchWebhookEvent('pipeline_completed', { status: 'error' })
        send(makeEvent('pipeline_error', msg))
      } finally {
        controller.close()
      }
    },
  })
}
