import { NextRequest } from 'next/server'
import { db } from '@/drizzle/db'
import { chatConversations, chatMessages, siteSettings } from '@/drizzle/schema'
import { eq, asc, desc } from 'drizzle-orm'
import { aiChatWithTools, getAIModelFromDB, type OpenRouterMessage, type ToolCall } from '@/lib/ai'
import { getToolDefinitions, executeTool } from '@/lib/chat-tools'
import { narrateEvent } from '@/lib/chat-tools/pipeline-narrator'
import { createPipelineStream } from '@/lib/agent-pipeline'
import { extractJson } from '@/lib/json-extract'
import type { PipelineEvent } from '@/lib/agents/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_TOOL_ITERATIONS = 8

interface ChatAssistantConfig {
  system_prompt: string
  enabled_tools: boolean
}

async function getChatAssistantConfig(): Promise<ChatAssistantConfig> {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'chat_assistant_config'))
      .limit(1)
    if (rows.length > 0 && rows[0].value) {
      const parsed = extractJson<Partial<ChatAssistantConfig>>(rows[0].value)
      const customPrompt = parsed?.system_prompt?.trim()
      return {
        system_prompt: customPrompt ? customPrompt : defaultSystemPrompt(),
        enabled_tools: parsed?.enabled_tools !== false,
      }
    }
  } catch {}
  return { system_prompt: defaultSystemPrompt(), enabled_tools: true }
}

function defaultSystemPrompt(): string {
  return `Você é um assistente inteligente do painel administrativo de um blog. Seu objetivo é ajudar o administrador a gerenciar conteúdo, criar artigos e obter insights sobre o blog.

Você tem acesso a ferramentas (tools) para executar ações reais no sistema:
- Listar, criar e editar artigos
- Publicar ou despublicar artigos
- Criar categorias e tags
- Sugerir e criar temas de artigos
- Disparar a pipeline completa de geração de artigos por IA
- Consultar analytics e dados do blog
- Verificar status da automação e newsletter

Seja proativo: quando o usuário pedir para criar um artigo, use a tool run_article_pipeline. Quando pedir dados, use as tools disponíveis.
Responda sempre em português do Brasil. Seja conciso e direto.`
}

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: NextRequest) {
  const userId = Number(request.headers.get('x-user-id') ?? '0')
  const body = await request.json().catch(() => ({})) as {
    conversationId?: number
    message?: string
  }

  if (!body.message?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Mensagem obrigatória' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(data)))
        } catch {}
      }

      try {
        // 1. Garantir conversa
        let conversationId = body.conversationId
        if (!conversationId) {
          const [conv] = await db
            .insert(chatConversations)
            .values({ user_id: userId, title: body.message!.slice(0, 60) })
            .returning()
          conversationId = conv.id
          send({ type: 'conversation_created', conversationId })
        }

        // 2. Persistir mensagem do usuário
        await db.insert(chatMessages).values({
          conversation_id: conversationId,
          role: 'user',
          content: body.message!,
        })

        // 3. Carregar histórico
        // Buscamos as mensagens mais RECENTES e depois reordenamos em ordem
        // cronológica. Usar .limit(40) com ordem ASC truncaria as mensagens
        // antigas mantendo um prefixo que pode começar numa mensagem `tool`
        // órfã (sem o assistant tool_calls correspondente), o que faz o
        // OpenRouter rejeitar a requisição com HTTP 400.
        const historyDesc = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversation_id, conversationId))
          .orderBy(desc(chatMessages.created_at))
          .limit(40)
        let history = historyDesc.slice().reverse()

        // Garante que a janela não comece numa mensagem `tool` órfã nem logo
        // após um assistant com tool_calls cujas respostas foram cortadas:
        // descarta mensagens `tool` iniciais sem o assistant tool_calls anterior.
        while (history.length > 0 && history[0].role === 'tool') {
          history = history.slice(1)
        }

        // 4. Carregar config do assistente
        const config = await getChatAssistantConfig()
        const model = await getAIModelFromDB('chat_assistant')

        // 5. Montar messages para o LLM
        const systemMsg: OpenRouterMessage = {
          role: 'system',
          content: config.system_prompt,
        }

        // Mapa tool_call_id → nome da função, derivado dos tool_calls dos
        // assistants no histórico. Necessário porque a coluna `tool_name`
        // armazena o id do tool_call (para a ligação tool_call_id), não o
        // nome da função; o campo `name` da mensagem `tool` exige o nome real.
        const toolCallNameById = new Map<string, string>()
        for (const m of history) {
          if (m.role === 'assistant' && m.tool_calls) {
            try {
              const calls = JSON.parse(m.tool_calls) as ToolCall[]
              for (const c of calls) toolCallNameById.set(c.id, c.function.name)
            } catch {}
          }
        }

        const historyMsgs: OpenRouterMessage[] = history.map((m) => {
          if (m.role === 'tool') {
            const callId = m.tool_name ?? ''
            return {
              role: 'tool' as const,
              content: m.content,
              tool_call_id: callId,
              name: toolCallNameById.get(callId) ?? undefined,
            }
          }
          if (m.role === 'assistant' && m.tool_calls) {
            const toolCallsParsed = (() => {
              try { return JSON.parse(m.tool_calls) as ToolCall[] } catch { return [] }
            })()
            return {
              role: 'assistant' as const,
              content: m.content || null,
              tool_calls: toolCallsParsed,
            }
          }
          return {
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          }
        })

        const messages: OpenRouterMessage[] = [systemMsg, ...historyMsgs]

        // 6. Loop de tool-calling
        const tools = config.enabled_tools ? getToolDefinitions() : []
        let iterations = 0
        let finalContent: string | null = null

        send({ type: 'assistant_start', timestamp: new Date().toISOString() })

        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++

          const result = await aiChatWithTools('chat_assistant', messages, tools, {
            temperature: 0.7,
            max_tokens: 2048,
            signal: request.signal,
          })

          // Sem tool_calls — resposta final
          if (!result.tool_calls || result.tool_calls.length === 0) {
            finalContent = result.content ?? ''

            // Persistir resposta do assistente
            await db.insert(chatMessages).values({
              conversation_id: conversationId,
              role: 'assistant',
              content: finalContent,
              model,
              tokens_used: result.usage.total_tokens,
            })

            send({
              type: 'assistant_message',
              role: 'assistant',
              content: finalContent,
              timestamp: new Date().toISOString(),
            })
            break
          }

          // Tem tool_calls — persiste e executa
          const assistantMsg: OpenRouterMessage = {
            role: 'assistant',
            content: result.content ?? null,
            tool_calls: result.tool_calls,
          }

          await db.insert(chatMessages).values({
            conversation_id: conversationId,
            role: 'assistant',
            content: result.content ?? '',
            tool_calls: JSON.stringify(result.tool_calls),
            model,
            tokens_used: result.usage.total_tokens,
          })

          messages.push(assistantMsg)

          // Executa cada tool
          for (const tc of result.tool_calls) {
            const toolName = tc.function.name
            let toolArgs: Record<string, unknown> = {}
            try {
              toolArgs = JSON.parse(tc.function.arguments) as Record<string, unknown>
            } catch {}

            send({
              type: 'tool_call',
              tool: toolName,
              args: toolArgs,
              timestamp: new Date().toISOString(),
            })

            // Caso especial: run_article_pipeline — intercepta e faz stream da pipeline
            if (toolName === 'run_article_pipeline') {
              const pipelineResult = await runPipelineWithStream(toolArgs, send, request.signal)

              const toolResultContent = JSON.stringify(pipelineResult)

              await db.insert(chatMessages).values({
                conversation_id: conversationId,
                role: 'tool',
                content: toolResultContent,
                tool_name: tc.id,
              })

              const toolResultMsg: OpenRouterMessage = {
                role: 'tool',
                content: toolResultContent,
                tool_call_id: tc.id,
                name: toolName,
              }
              messages.push(toolResultMsg)

              send({
                type: 'tool_result',
                tool: toolName,
                result: pipelineResult,
                timestamp: new Date().toISOString(),
              })
              continue
            }

            // Tool normal
            const toolResult = await executeTool(toolName, toolArgs, { userId })
            const toolResultContent = JSON.stringify(toolResult)

            await db.insert(chatMessages).values({
              conversation_id: conversationId,
              role: 'tool',
              content: toolResultContent,
              tool_name: tc.id,
            })

            const toolResultMsg: OpenRouterMessage = {
              role: 'tool',
              content: toolResultContent,
              tool_call_id: tc.id,
              name: toolName,
            }
            messages.push(toolResultMsg)

            send({
              type: 'tool_result',
              tool: toolName,
              result: toolResult,
              timestamp: new Date().toISOString(),
            })
          }
        }

        // Atualizar updated_at da conversa
        await db
          .update(chatConversations)
          .set({ updated_at: new Date() })
          .where(eq(chatConversations.id, conversationId))

        send({ type: 'done', timestamp: new Date().toISOString() })
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro interno do servidor'
        send({ type: 'error', error: msg, timestamp: new Date().toISOString() })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Executa a pipeline de geração de artigo e streama os eventos narratados para o chat.
 * Retorna o resultado final para ser passado de volta ao LLM como tool result.
 */
async function runPipelineWithStream(
  args: Record<string, unknown>,
  send: (data: Record<string, unknown>) => void,
  signal?: AbortSignal
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const pipelineStream = createPipelineStream({
      themeIds: args.theme_id ? [Number(args.theme_id)] : [],
      triggers: { publishStatus: (args.publish_status as 'draft' | 'published') ?? 'draft' },
      initialContext: {
        ...(args.theme_title ? { themeTitle: String(args.theme_title) } : {}),
        ...(args.theme_description ? { themeDescription: String(args.theme_description) } : {}),
      },
      signal,
    })

    const reader = pipelineStream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResult: Record<string, unknown> = { pipeline_started: true }

    const read = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            resolve(finalResult)
            return
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue

            try {
              const event = JSON.parse(raw) as PipelineEvent
              const narrated = narrateEvent(event)

              if (narrated) {
                send({
                  type: 'pipeline_agent',
                  agent: narrated.agent,
                  content: narrated.text,
                  event_type: narrated.type,
                  timestamp: event.timestamp,
                })
              }

              // Captura resultado final
              if (event.type === 'pipeline_done') {
                finalResult = {
                  success: true,
                  message: event.message,
                  post_id: event.data?.post_id ?? event.data?.postId,
                  title: event.data?.title,
                }
              } else if (event.type === 'pipeline_error') {
                finalResult = { success: false, error: event.message }
              }
            } catch {}
          }
        }
      } catch {
        resolve(finalResult)
      }
    }

    read()
  })
}
