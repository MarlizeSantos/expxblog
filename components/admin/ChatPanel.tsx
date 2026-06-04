'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useChatPanel } from './ChatPanelContext'

interface Conversation {
  id: number
  title: string
  updated_at: string
}

interface Message {
  id?: number
  role: 'user' | 'assistant' | 'tool' | 'system' | 'pipeline_agent'
  content: string
  agent?: string
  timestamp?: string
  isStreaming?: boolean
}

type StreamEvent =
  | { type: 'conversation_created'; conversationId: number }
  | { type: 'assistant_start'; timestamp: string }
  | { type: 'assistant_message'; role: 'assistant'; content: string; timestamp: string }
  | { type: 'tool_call'; tool: string; args: Record<string, unknown>; timestamp: string }
  | { type: 'tool_result'; tool: string; result: unknown; timestamp: string }
  | { type: 'pipeline_agent'; agent: string; content: string; event_type: string; timestamp: string }
  | { type: 'done'; timestamp: string }
  | { type: 'error'; error: string; timestamp: string }

const AGENT_COLORS: Record<string, string> = {
  'Gerador de Título': '#1A4FA0',
  'Pesquisador': '#0891b2',
  'Analista': '#7c3aed',
  'Redator': '#065f46',
  'Revisor': '#b45309',
  'Especialista em CTA': '#be185d',
  'Designer de Capa': '#dc2626',
  'Publicador': '#059669',
  'Pipeline': '#374151',
}

function AgentBubble({ agent, content }: { agent: string; content: string }) {
  const color = AGENT_COLORS[agent] ?? '#6b7280'
  return (
    <div className="flex gap-2 items-start">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white text-[10px] font-bold"
        style={{ backgroundColor: color }}
      >
        {agent.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold mb-0.5" style={{ color }}>
          {agent}
        </p>
        <div
          className="text-xs text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
        />
      </div>
    </div>
  )
}

function ToolCallBubble({ tool }: { tool: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-px h-4 bg-brand-secondary shrink-0 ml-3" />
      <span className="text-[11px] text-gray-500 italic">
        Executando: <span className="font-mono text-brand-primary">{tool}</span>
      </span>
      <span className="w-3 h-3 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
    </div>
  )
}

export function ChatPanel() {
  const { isOpen, close } = useChatPanel()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentTool, setCurrentTool] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [view, setView] = useState<'chat' | 'conversations'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat/conversations')
      if (res.ok) {
        const data = await res.json() as { conversations: Conversation[] }
        setConversations(data.conversations)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (isOpen) loadConversations()
  }, [isOpen, loadConversations])

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: number) => {
    try {
      const res = await fetch(`/api/admin/chat/conversations/${convId}/messages`)
      if (res.ok) {
        const data = await res.json() as { messages: Array<{ role: string; content: string; tool_name?: string; created_at: string }> }
        const msgs: Message[] = data.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as Message['role'],
            content: m.content,
            timestamp: m.created_at,
          }))
        setMessages(msgs)
      }
    } catch {}
  }, [])

  const selectConversation = useCallback(async (id: number) => {
    setActiveConvId(id)
    setMessages([])
    setView('chat')
    await loadMessages(id)
  }, [loadMessages])

  const newConversation = useCallback(() => {
    setActiveConvId(null)
    setMessages([])
    setView('chat')
    inputRef.current?.focus()
  }, [])

  const deleteConversation = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/admin/chat/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (activeConvId === id) {
          setActiveConvId(null)
          setMessages([])
        }
      }
    } catch {
      showToast('error', 'Erro ao excluir conversa')
    }
  }, [activeConvId, showToast])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)
    setCurrentTool(null)

    // Adicionar mensagem do usuário imediatamente
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])

    // Adicionar placeholder do assistente
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', isStreaming: true, timestamp: new Date().toISOString() },
    ])

    try {
      const res = await fetch('/api/admin/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConvId, message: text }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Erro na requisição')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const event = JSON.parse(raw) as StreamEvent

            if (event.type === 'conversation_created') {
              setActiveConvId(event.conversationId)
              await loadConversations()
            }

            if (event.type === 'tool_call') {
              setCurrentTool(event.tool)
              setMessages((prev) => {
                const newMsgs = [...prev]
                let lastIdx = -1
                for (let i = newMsgs.length - 1; i >= 0; i--) {
                  if (newMsgs[i].isStreaming) { lastIdx = i; break }
                }
                if (lastIdx >= 0) {
                  newMsgs.splice(lastIdx, 0, {
                    role: 'tool',
                    content: `Chamando: ${event.tool}`,
                    agent: event.tool,
                    timestamp: event.timestamp,
                  })
                }
                return newMsgs
              })
            }

            if (event.type === 'tool_result') {
              setCurrentTool(null)
            }

            if (event.type === 'pipeline_agent') {
              setMessages((prev) => {
                const newMsgs = [...prev]
                let lastIdx = -1
                for (let i = newMsgs.length - 1; i >= 0; i--) {
                  if (newMsgs[i].isStreaming) { lastIdx = i; break }
                }
                newMsgs.splice(lastIdx >= 0 ? lastIdx : newMsgs.length, 0, {
                  role: 'pipeline_agent',
                  content: event.content,
                  agent: event.agent,
                  timestamp: event.timestamp,
                })
                return newMsgs
              })
            }

            if (event.type === 'assistant_message') {
              setCurrentTool(null)
              setMessages((prev) =>
                prev.map((m) =>
                  m.isStreaming
                    ? { ...m, content: event.content, isStreaming: false }
                    : m
                )
              )
            }

            if (event.type === 'done') {
              // Remove qualquer placeholder restante
              setMessages((prev) => prev.filter((m) => !m.isStreaming))
              await loadConversations()
            }

            if (event.type === 'error') {
              setMessages((prev) => prev.filter((m) => !m.isStreaming))
              showToast('error', event.error ?? 'Erro no assistente')
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => prev.filter((m) => !m.isStreaming))
      showToast('error', 'Erro ao enviar mensagem')
    } finally {
      setIsLoading(false)
      setCurrentTool(null)
    }
  }, [input, isLoading, activeConvId, loadConversations, showToast])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[400px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h2 className="text-sm font-semibold text-neutral-900">Assistente</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView(view === 'conversations' ? 'chat' : 'conversations')}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Conversas"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              onClick={newConversation}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Nova conversa"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={close}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Fechar"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mx-4 mt-2 px-3 py-2 rounded-lg text-xs font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {toast.msg}
          </div>
        )}

        {/* Conversations list */}
        {view === 'conversations' ? (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Conversas recentes</p>
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-8">Nenhuma conversa ainda</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${activeConvId === conv.id ? 'bg-blue-50 text-brand-primary' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="text-sm truncate">{conv.title}</span>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-30">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p className="text-sm">Como posso ajudar hoje?</p>
                  <p className="text-xs mt-1 opacity-70">Peça para criar um artigo, listar posts, ver analytics...</p>
                </div>
              )}

              {messages.map((msg, idx) => {
                if (msg.role === 'pipeline_agent') {
                  return (
                    <AgentBubble key={idx} agent={msg.agent ?? 'Agente'} content={msg.content} />
                  )
                }

                if (msg.role === 'tool') {
                  return (
                    <div key={idx} className="flex items-center gap-2 py-0.5">
                      <div className="w-px h-4 bg-brand-secondary shrink-0 ml-3" />
                      <span className="text-[11px] text-gray-400 italic font-mono">{msg.content}</span>
                    </div>
                  )
                }

                if (msg.role === 'user') {
                  return (
                    <div key={idx} className="flex justify-end">
                      <div className="max-w-[80%] bg-brand-primary text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  )
                }

                if (msg.role === 'assistant') {
                  return (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        {msg.isStreaming && !msg.content ? (
                          <div className="flex gap-1 items-center py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  )
                }

                return null
              })}

              {currentTool && (
                <ToolCallBubble tool={currentTool} />
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-4 pb-4 pt-2 border-t border-gray-100">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite uma mensagem..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50 max-h-32 overflow-y-auto"
                  style={{ minHeight: '40px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">Enter para enviar · Shift+Enter para nova linha</p>
            </div>
          </>
        )}
      </div>
    </>
  )
}
