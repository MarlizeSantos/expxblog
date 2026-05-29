'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ArticleTheme {
  id: number
  title: string
  description: string | null
  source: string
  status: string
}

type AgentId =
  | 'headline'
  | 'researcher'
  | 'analyst'
  | 'copywriter'
  | 'reviewer'
  | 'cta'
  | 'designer'
  | 'publisher'

interface PipelineEvent {
  type: string
  agent?: AgentId
  message: string
  data?: Record<string, unknown>
  timestamp: string
}

type Step =
  | 'method'
  | 'ai_type'
  | 'select_theme'
  | 'enter_url'
  | 'enter_text'
  | 'pipeline'

interface Props {
  open: boolean
  onClose: () => void
}

const PIPELINE_AGENT_ORDER: AgentId[] = [
  'headline', 'researcher', 'analyst', 'copywriter', 'reviewer', 'cta', 'designer', 'publisher',
]

const AGENT_LABELS: Record<AgentId, string> = {
  headline: 'Headline',
  researcher: 'Pesquisador',
  analyst: 'Analista',
  copywriter: 'Copywriter',
  reviewer: 'Revisor',
  cta: 'CTA',
  designer: 'Designer',
  publisher: 'Publicador',
}

const STATUS_ICONS: Record<string, string> = {
  idle: '⬜',
  running: '🔄',
  done: '✅',
  error: '❌',
  retry: '🔁',
}

export default function NewArticleModal({ open, onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('method')
  const [themes, setThemes] = useState<ArticleTheme[]>([])
  const [url, setUrl] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [error, setError] = useState('')

  // Pipeline state
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentId, string>>({} as Record<AgentId, string>)
  const [logs, setLogs] = useState<PipelineEvent[]>([])
  const [pipelineDone, setPipelineDone] = useState(false)
  const [pipelineError, setPipelineError] = useState(false)
  const [finalPostId, setFinalPostId] = useState<number | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) {
      setStep('method')
      setUrl('')
      setPastedText('')
      setError('')
      setLogs([])
      setPipelineDone(false)
      setPipelineError(false)
      setFinalPostId(null)
      const init = {} as Record<AgentId, string>
      PIPELINE_AGENT_ORDER.forEach((id) => { init[id] = 'idle' })
      setAgentStatuses(init)
    }
  }, [open])

  useEffect(() => {
    if (open && step === 'select_theme') {
      fetch('/api/admin/themes')
        .then((r) => r.json())
        .then((data) => setThemes(data.themes ?? []))
        .catch(() => setThemes([]))
    }
  }, [open, step])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  function abortPipeline() {
    abortControllerRef.current?.abort()
    setPipelineError(true)
    setError('Pipeline interrompido manualmente.')
  }

  async function runPipeline(body: Record<string, unknown>) {
    setStep('pipeline')
    setLogs([])
    setPipelineDone(false)
    setPipelineError(false)
    setFinalPostId(null)
    const init = {} as Record<AgentId, string>
    PIPELINE_AGENT_ORDER.forEach((id) => { init[id] = 'idle' })
    setAgentStatuses(init)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const res = await fetch('/api/admin/agents/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishStatus: 'draft', ...body }),
      signal: abortController.signal,
    }).catch((err) => {
      if (err.name === 'AbortError') return null
      throw err
    })

    if (!res) return

    if (!res.body) {
      setPipelineError(true)
      setError('Falha ao conectar com o pipeline')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim()
        if (!line) continue
        try {
          const event: PipelineEvent = JSON.parse(line)
          setLogs((prev) => [...prev, event])
          if (event.agent) {
            setAgentStatuses((prev) => ({
              ...prev,
              [event.agent!]:
                event.type === 'agent_start' ? 'running'
                : event.type === 'agent_done' ? 'done'
                : event.type === 'agent_error' ? 'error'
                : event.type === 'agent_retry' ? 'retry'
                : prev[event.agent!],
            }))
          }
          if (event.type === 'pipeline_done') {
            setPipelineDone(true)
            const postId = event.data?.post_id as number | undefined
            if (postId) setFinalPostId(postId)
          }
          if (event.type === 'pipeline_error') {
            setPipelineError(true)
            setError(event.message)
          }
        } catch {}
      }
    }
  }

  function handleManual() {
    onClose()
    router.push('/admin/artigos/novo')
  }

  function handleThemeSelect(theme: ArticleTheme) {
    runPipeline({ themeIds: [theme.id], themeTitle: theme.title, themeDescription: theme.description ?? undefined })
  }

  function handleUrlGenerate() {
    if (!url.trim()) return
    runPipeline({ initialLinks: [url.trim()], headline: '' })
  }

  function handleTextGenerate() {
    if (pastedText.trim().length < 100) return
    runPipeline({ pastedText: pastedText.trim(), headline: '' })
  }

  function goBack() {
    if (step === 'ai_type') setStep('method')
    else if (step === 'select_theme' || step === 'enter_url' || step === 'enter_text') setStep('ai_type')
  }

  function openArticle() {
    if (finalPostId) {
      onClose()
      router.push(`/admin/artigos/${finalPostId}/editar`)
    }
  }

  if (!open) return null

  const titles: Record<Step, string> = {
    method: 'Novo Artigo',
    ai_type: 'Criar com IA',
    select_theme: 'Escolha um Tema',
    enter_url: 'Link de Referência',
    enter_text: 'Texto Base',
    pipeline: pipelineDone ? 'Artigo Gerado!' : pipelineError ? 'Erro no Pipeline' : 'Gerando Artigo...',
  }

  const canGoBack = step !== 'method' && step !== 'pipeline'
  const isRunning = step === 'pipeline' && !pipelineDone && !pipelineError

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={isRunning ? undefined : onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-neutral-900">{titles[step]}</h2>
          {!isRunning && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-6">
          {error && step !== 'pipeline' && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}

          {/* method */}
          {step === 'method' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleManual}
                className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                <svg className="h-10 w-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span className="text-sm font-semibold text-neutral-900">Manual</span>
                <span className="text-xs text-gray-500 text-center">Escrever artigo do zero</span>
              </button>
              <button
                onClick={() => setStep('ai_type')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                <svg className="h-10 w-10 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                </svg>
                <span className="text-sm font-semibold text-neutral-900">Com Agentes de IA</span>
                <span className="text-xs text-gray-500 text-center">Pipeline completo com 8 agentes especializados</span>
              </button>
            </div>
          )}

          {/* ai_type */}
          {step === 'ai_type' && (
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setStep('select_theme')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                <svg className="h-10 w-10 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6" /><path d="M10 22h4" />
                  <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
                </svg>
                <span className="text-sm font-semibold text-neutral-900">Tema Cadastrado</span>
                <span className="text-xs text-gray-500 text-center">Escolha um tema e o pipeline gera tudo automaticamente</span>
              </button>
              <button
                onClick={() => setStep('enter_url')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                <svg className="h-10 w-10 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                <span className="text-sm font-semibold text-neutral-900">Link de Referência</span>
                <span className="text-xs text-gray-500 text-center">Cole um link e os agentes criam o artigo baseado no conteúdo</span>
              </button>
              <button
                onClick={() => setStep('enter_text')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                <svg className="h-10 w-10 text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span className="text-sm font-semibold text-neutral-900">Texto Colado</span>
                <span className="text-xs text-gray-500 text-center">Cole um texto base e os agentes criam o artigo a partir dele</span>
              </button>
            </div>
          )}

          {/* select_theme */}
          {step === 'select_theme' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Selecione um tema para os agentes gerarem o artigo:</p>
              {themes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhum tema cadastrado. Cadastre temas na seção &quot;Temas&quot;.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeSelect(theme)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900">{theme.title}</div>
                          {theme.description && (
                            <div className="text-xs text-gray-500 mt-1 leading-relaxed">{theme.description}</div>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide shrink-0 ${theme.source === 'ai' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {theme.source === 'ai' ? 'IA' : 'Manual'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* enter_url */}
          {step === 'enter_url' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Cole o link de referência. Os agentes vão ler o conteúdo e criar um artigo original baseado nele.</p>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlGenerate()}
                  placeholder="https://exemplo.com/artigo"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  autoFocus
                />
                <button
                  onClick={handleUrlGenerate}
                  disabled={!url.trim()}
                  className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Gerar Artigo
                </button>
              </div>
            </div>
          )}

          {/* enter_text */}
          {step === 'enter_text' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Cole o texto base. Os agentes vão usá-lo como referência principal para criar um artigo original.</p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole aqui o texto que servirá de base para o artigo..."
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {pastedText.length} caracteres {pastedText.length < 100 && pastedText.length > 0 ? '(mínimo 100)' : ''}
                </span>
                <button
                  onClick={handleTextGenerate}
                  disabled={pastedText.trim().length < 100}
                  className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Gerar Artigo
                </button>
              </div>
            </div>
          )}

          {/* pipeline */}
          {step === 'pipeline' && (
            <div className="space-y-4">
              {/* Agent status chips */}
              <div className="flex flex-wrap gap-2">
                {PIPELINE_AGENT_ORDER.map((agentId) => {
                  const status = agentStatuses[agentId] ?? 'idle'
                  return (
                    <div
                      key={agentId}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        status === 'done' ? 'bg-green-50 border-green-200 text-green-700'
                        : status === 'running' ? 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'
                        : status === 'error' ? 'bg-red-50 border-red-200 text-red-700'
                        : status === 'retry' ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                      }`}
                    >
                      <span>{STATUS_ICONS[status] ?? '⬜'}</span>
                      {AGENT_LABELS[agentId]}
                    </div>
                  )
                })}
              </div>

              {/* Log terminal */}
              <div className="bg-gray-950 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs text-gray-300 space-y-0.5">
                {logs.map((ev, i) => (
                  <div key={i} className={
                    ev.type === 'pipeline_done' ? 'text-green-400'
                    : ev.type === 'pipeline_error' || ev.type === 'agent_error' ? 'text-red-400'
                    : ev.type === 'agent_retry' ? 'text-yellow-400'
                    : ev.type === 'agent_done' ? 'text-green-300'
                    : 'text-gray-400'
                  }>
                    [{ev.timestamp.slice(11, 19)}] {ev.agent ? `[${ev.agent}] ` : ''}{ev.message}
                  </div>
                ))}
                {isRunning && (
                  <div className="text-gray-500 animate-pulse">▌</div>
                )}
                <div ref={logsEndRef} />
              </div>

              {/* Status footer */}
              {isRunning && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full" />
                    Pipeline em execução, aguarde...
                  </div>
                  <button
                    onClick={abortPipeline}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Interromper
                  </button>
                </div>
              )}

              {pipelineDone && finalPostId && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
                    ✅ Artigo gerado e salvo como rascunho!
                  </div>
                  <button
                    onClick={openArticle}
                    className="px-5 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Abrir Artigo →
                  </button>
                </div>
              )}

              {pipelineError && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  ❌ {error || 'Erro no pipeline. Veja o log acima para detalhes.'}
                </div>
              )}
            </div>
          )}
        </div>

        {canGoBack && (
          <div className="px-6 pb-6">
            <button onClick={goBack} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              &larr; Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
