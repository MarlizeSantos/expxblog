/**
 * lib/chat-tools/pipeline-narrator.ts
 * Converte PipelineEvents em falas em 1ª pessoa por agente, em português.
 */
import type { PipelineEvent, AgentId } from '@/lib/agents/types'

export interface NarratedEvent {
  agent: string
  text: string
  type: PipelineEvent['type']
}

const AGENT_NAMES: Record<AgentId, string> = {
  headline: 'Gerador de Título',
  researcher: 'Pesquisador',
  analyst: 'Analista',
  copywriter: 'Redator',
  reviewer: 'Revisor',
  cta: 'Especialista em CTA',
  designer: 'Designer de Capa',
  publisher: 'Publicador',
}

const AGENT_EMOJIS: Record<AgentId, string> = {
  headline: '✏️',
  researcher: '🔎',
  analyst: '📊',
  copywriter: '📝',
  reviewer: '🔍',
  cta: '📢',
  designer: '🎨',
  publisher: '🚀',
}

function agentStart(agent: AgentId, message: string): string {
  const templates: Record<AgentId, string> = {
    headline: 'Estou gerando o título do artigo...',
    researcher: 'Iniciando pesquisa de fontes e referências sobre o tema...',
    analyst: 'Analisando as fontes encontradas e extraindo insights...',
    copywriter: 'Começando a redigir o artigo completo...',
    reviewer: 'Revisando o artigo para verificar qualidade e coerência...',
    cta: 'Criando a chamada para ação do artigo...',
    designer: 'Gerando a imagem de capa do artigo...',
    publisher: 'Publicando o artigo no blog...',
  }
  return templates[agent] ?? message
}

function agentDone(agent: AgentId, message: string, data?: Record<string, unknown>): string {
  const templates: Record<AgentId, (d?: Record<string, unknown>) => string> = {
    headline: (d) => `Título gerado: "${d?.headline ?? d?.title ?? message}"`,
    researcher: () => `Reuni as melhores fontes sobre o tema. Passando para análise.`,
    analyst: () => `Análise concluída. Resumos das fontes prontos para o redator.`,
    copywriter: () => `Artigo redigido com sucesso! Enviando para revisão.`,
    reviewer: (d) => {
      if (d?.approved === true) return `Artigo aprovado! Qualidade e coerência confirmadas.`
      return `Encontrei pontos para melhorar. Solicitando revisão ao redator.`
    },
    cta: () => `Call-to-action inserido ao final do artigo.`,
    designer: () => `Imagem de capa gerada com sucesso!`,
    publisher: (d) => {
      const postId = d?.postId ?? d?.post_id
      return `Artigo publicado no blog!${postId ? ` ID: ${postId}` : ''}`
    },
  }
  return templates[agent]?.(data) ?? message
}

function agentError(agent: AgentId, message: string): string {
  const name = AGENT_NAMES[agent] ?? agent
  return `Encontrei um problema: ${message}`
}

function agentRetry(agent: AgentId, message: string): string {
  return `Tentando novamente... ${message}`
}

export function narrateEvent(event: PipelineEvent): NarratedEvent | null {
  const { type, agent, message, data } = event

  // Eventos sem agente específico
  if (type === 'pipeline_done') {
    return {
      agent: 'Pipeline',
      text: '✅ Pipeline concluída! O artigo foi gerado e está disponível no blog.',
      type,
    }
  }

  if (type === 'pipeline_error') {
    return {
      agent: 'Pipeline',
      text: `❌ Erro na pipeline: ${message}`,
      type,
    }
  }

  // Eventos de log verbose — omitir para não poluir o chat
  if (type === 'log') return null

  if (!agent) return null

  const emoji = AGENT_EMOJIS[agent] ?? '🤖'
  const name = AGENT_NAMES[agent] ?? agent

  let text = ''
  switch (type) {
    case 'agent_start':
      text = `${emoji} **${name}:** ${agentStart(agent, message)}`
      break
    case 'agent_done':
      text = `${emoji} **${name}:** ${agentDone(agent, message, data)}`
      break
    case 'agent_error':
      text = `⚠️ **${name}:** ${agentError(agent, message)}`
      break
    case 'agent_retry':
      text = `🔄 **${name}:** ${agentRetry(agent, message)}`
      break
    default:
      return null
  }

  return { agent: name, text, type }
}
