// lib/agent-pipeline.ts
import { getAIApiKey } from '@/lib/ai'
import { runHeadlineAgent } from '@/lib/agents/headline'
import { runResearcherAgent } from '@/lib/agents/researcher'
import { runAnalystAgent } from '@/lib/agents/analyst'
import { runCopywriterAgent } from '@/lib/agents/copywriter'
import { runReviewerAgent, MAX_REVIEW_CYCLES } from '@/lib/agents/reviewer'
import { runCtaAgent } from '@/lib/agents/cta'
import { runDesignerAgent } from '@/lib/agents/designer'
import { runPublisherAgent } from '@/lib/agents/publisher'
import { AgentContext, AgentId, PipelineEvent, PublisherTriggers } from '@/lib/agents/types'

export interface PipelineOptions {
  themeIds: number[]
  triggers: PublisherTriggers
  initialContext?: Partial<AgentContext>
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

      try {
        const apiKey = await getAIApiKey()
        if (!apiKey) {
          send(makeEvent('pipeline_error', 'Chave de API do OpenRouter não configurada.'))
          controller.close()
          return
        }

        // 1. Headline — skip if already provided via initialContext
        if (!ctx.headline) {
          send(makeEvent('agent_start', 'Gerando headline...', 'headline'))
          const headlineResult = await runHeadlineAgent(ctx, options.themeIds, apiKey)
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

        // 2. Researcher — seed with initialContext.researchLinks if provided
        send(makeEvent('agent_start', 'Pesquisando referências na web...', 'researcher'))
        const researchResult = await runResearcherAgent(ctx, apiKey)
        if (!researchResult.success) {
          send(makeEvent('agent_error', researchResult.message, 'researcher'))
          // non-fatal: continue with no links
        } else {
          Object.assign(ctx, researchResult.data)
          send(makeEvent('agent_done', researchResult.message, 'researcher', { count: ctx.researchLinks?.length }))
        }

        // 3. Analyst
        send(makeEvent('agent_start', 'Analisando fontes...', 'analyst'))
        const analystResult = await runAnalystAgent(ctx, apiKey)
        Object.assign(ctx, analystResult.data ?? {})
        send(makeEvent('agent_done', analystResult.message, 'analyst', { summaries: ctx.sourceSummaries?.length }))

        // 4. Copywriter (+ review loop)
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

        // 5. Reviewer loop
        ctx.reviewCycles = 0
        while (ctx.reviewCycles! < MAX_REVIEW_CYCLES) {
          send(makeEvent('agent_start', `Revisando artigo (ciclo ${(ctx.reviewCycles ?? 0) + 1})...`, 'reviewer'))
          const reviewResult = await runReviewerAgent(ctx, apiKey)

          if (reviewResult.approved) {
            send(makeEvent('agent_done', reviewResult.message, 'reviewer'))
            break
          }

          ctx.reviewCycles = (ctx.reviewCycles ?? 0) + 1
          send(makeEvent('agent_retry', reviewResult.message, 'reviewer', { issues: reviewResult.issues }))

          if (ctx.reviewCycles >= MAX_REVIEW_CYCLES) {
            send(makeEvent('agent_done', 'Limite de revisões atingido, prosseguindo', 'reviewer'))
            break
          }

          // Re-run copywriter with reviewer feedback
          send(makeEvent('agent_start', 'Corrigindo artigo...', 'copywriter'))
          const fixPrompt = `Corrija os seguintes problemas no artigo:\n${(reviewResult.issues ?? []).map((i) => `- ${i}`).join('\n')}\n\nArtigo atual:\n${ctx.articleContent}`
          const fixedCtx: AgentContext = { ...ctx, sourceSummaries: [{ url: 'revisao', summary: fixPrompt }] }
          const fixResult = await runCopywriterAgent(fixedCtx, apiKey)
          if (fixResult.success) {
            Object.assign(ctx, fixResult.data)
            send(makeEvent('agent_done', 'Artigo corrigido', 'copywriter'))
          }
        }

        // 6. CTA
        send(makeEvent('agent_start', 'Inserindo CTA...', 'cta'))
        const ctaResult = await runCtaAgent(ctx, apiKey)
        if (ctaResult.success) Object.assign(ctx, ctaResult.data)
        send(makeEvent('agent_done', ctaResult.message, 'cta'))

        // 7. Designer
        send(makeEvent('agent_start', 'Gerando imagem de capa...', 'designer'))
        try {
          const designResult = await runDesignerAgent(ctx, apiKey)
          if (designResult.success) Object.assign(ctx, designResult.data)
          send(makeEvent('agent_done', designResult.message, 'designer'))
        } catch (imgErr) {
          const msg = imgErr instanceof Error ? imgErr.message : String(imgErr)
          send(makeEvent('agent_error', `Imagem falhou (continuando): ${msg}`, 'designer'))
        }

        // 8. Publisher
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

        send(makeEvent('pipeline_done', `Pipeline concluído! Artigo ID ${ctx.postId}`, undefined, { post_id: ctx.postId }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        send(makeEvent('pipeline_error', msg))
      } finally {
        controller.close()
      }
    },
  })
}
