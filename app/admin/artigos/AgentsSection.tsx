'use client'
import { useState, useEffect, useRef } from 'react'

type AgentId =
  | 'headline'
  | 'researcher'
  | 'analyst'
  | 'copywriter'
  | 'reviewer'
  | 'cta'
  | 'designer'
  | 'publisher'

interface AgentConfigState {
  id: AgentId
  label: string
  description: string
  prompt: string
  model: string
  supportsImageModel: boolean
}

interface PipelineEvent {
  type: string
  agent?: AgentId
  message: string
  data?: Record<string, unknown>
  timestamp: string
}

interface Toast { type: 'success' | 'error'; msg: string }

const PIPELINE_AGENT_ORDER: AgentId[] = [
  'headline', 'researcher', 'analyst', 'copywriter', 'reviewer', 'cta', 'designer', 'publisher'
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

export default function AgentsSection() {
  const [configs, setConfigs] = useState<AgentConfigState[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<AgentId | null>(null)
  const [generating, setGenerating] = useState<AgentId | null>(null)
  const [expandedAgent, setExpandedAgent] = useState<AgentId | null>(null)
  const [models, setModels] = useState<{ id: string; name: string }[]>([])
  const [imageModels, setImageModels] = useState<{ id: string; name: string }[]>([])
  const [modelSearch, setModelSearch] = useState<Record<AgentId, string>>({} as Record<AgentId, string>)
  const [modelDropdownOpen, setModelDropdownOpen] = useState<AgentId | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [firecrawlConfigured, setFirecrawlConfigured] = useState(false)
  const [pexelsConfigured, setPexelsConfigured] = useState(false)
  const [agentsExtra, setAgentsExtra] = useState<Record<string, { use_firecrawl?: boolean; image_source?: 'ai' | 'pexels' | 'code'; code_style?: 'gradient' | 'geometric'; reviewer_enabled?: boolean }>>({})
  const [savingExtra, setSavingExtra] = useState<AgentId | null>(null)

  // Pipeline runner state
  const [running, setRunning] = useState(false)
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentId, string>>({} as Record<AgentId, string>)
  const [logs, setLogs] = useState<PipelineEvent[]>([])
  const [publishStatus, setPublishStatus] = useState<'published' | 'draft'>('published')
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/agents/configs')
      .then((r) => r.json())
      .then((data: { configs?: AgentConfigState[] }) => {
        if (data.configs) setConfigs(data.configs)
      })
      .finally(() => setLoading(false))

    Promise.all([
      fetch('/api/admin/ai/models').then((r) => r.json()),
      fetch('/api/admin/ai/image-models').then((r) => r.json()),
    ])
      .then(([chatData, imageData]: [{ id: string; name: string }[] | { models?: { id: string; name: string }[] }, { id: string; name: string }[]]) => {
        const chatList = Array.isArray(chatData) ? chatData : (chatData.models ?? [])
        setModels(chatList)
        setImageModels(Array.isArray(imageData) ? imageData : [])
      })
      .catch(() => {})

    fetch('/api/admin/agents/extra')
      .then((r) => r.json())
      .then((data: { firecrawl_configured?: boolean; pexels_configured?: boolean; agents_extra?: Record<string, { use_firecrawl?: boolean; image_source?: 'ai' | 'pexels' | 'code'; code_style?: 'gradient' | 'geometric'; reviewer_enabled?: boolean }> }) => {
        setFirecrawlConfigured(data.firecrawl_configured ?? false)
        setPexelsConfigured(data.pexels_configured ?? false)
        setAgentsExtra(data.agents_extra ?? {})
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  function updateConfig(id: AgentId, patch: Partial<AgentConfigState>) {
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  async function saveConfig(id: AgentId) {
    const cfg = configs.find((c) => c.id === id)
    if (!cfg) return
    setSaving(id)
    try {
      const res = await fetch('/api/admin/agents/configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, prompt: cfg.prompt, model: cfg.model }),
      })
      if (res.ok) setToast({ type: 'success', msg: `${cfg.label} salvo!` })
      else setToast({ type: 'error', msg: 'Erro ao salvar' })
    } finally {
      setSaving(null)
    }
  }

  async function toggleFirecrawl(id: AgentId, enabled: boolean) {
    const updated = { ...agentsExtra, [id]: { ...(agentsExtra[id] ?? {}), use_firecrawl: enabled } }
    setAgentsExtra(updated)
    setSavingExtra(id)
    try {
      await fetch('/api/admin/agents/extra', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents_extra: updated }),
      })
      setToast({ type: 'success', msg: `Firecrawl ${enabled ? 'ativado' : 'desativado'} para ${AGENT_LABELS[id]}` })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar' })
    } finally {
      setSavingExtra(null)
    }
  }

  async function toggleReviewer(enabled: boolean) {
    const updated = { ...agentsExtra, reviewer: { ...(agentsExtra['reviewer'] ?? {}), reviewer_enabled: enabled } }
    setAgentsExtra(updated)
    setSavingExtra('reviewer')
    try {
      await fetch('/api/admin/agents/extra', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents_extra: updated }),
      })
      setToast({ type: 'success', msg: `Revisor ${enabled ? 'ativado' : 'desativado'}` })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar' })
    } finally {
      setSavingExtra(null)
    }
  }

  async function setImageSource(source: 'ai' | 'pexels' | 'code') {
    const updated = { ...agentsExtra, designer: { ...(agentsExtra['designer'] ?? {}), image_source: source } }
    setAgentsExtra(updated)
    setSavingExtra('designer')
    try {
      await fetch('/api/admin/agents/extra', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents_extra: updated }),
      })
      setToast({ type: 'success', msg: `Fonte de imagem alterada para ${source === 'pexels' ? 'Pexels' : source === 'code' ? 'Código (SVG)' : 'IA'}` })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar' })
    } finally {
      setSavingExtra(null)
    }
  }

  async function setCodeStyle(style: 'gradient' | 'geometric') {
    const updated = { ...agentsExtra, designer: { ...(agentsExtra['designer'] ?? {}), code_style: style } }
    setAgentsExtra(updated)
    setSavingExtra('designer')
    try {
      await fetch('/api/admin/agents/extra', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents_extra: updated }),
      })
      setToast({ type: 'success', msg: `Estilo SVG alterado para ${style === 'geometric' ? 'Padrão Geométrico' : 'Gradiente + Título'}` })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar estilo SVG' })
    } finally {
      setSavingExtra(null)
    }
  }

  async function generatePrompt(id: AgentId) {
    setGenerating(id)
    try {
      const res = await fetch('/api/admin/agents/configs/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: id }),
      })
      const data = await res.json() as { prompt?: string; error?: string }
      if (data.prompt) {
        updateConfig(id, { prompt: data.prompt })
        setToast({ type: 'success', msg: 'Prompt gerado pela IA!' })
      } else {
        setToast({ type: 'error', msg: data.error ?? 'Erro ao gerar prompt' })
      }
    } finally {
      setGenerating(null)
    }
  }

  async function runPipeline() {
    setRunning(true)
    setLogs([])
    const initStatuses = {} as Record<AgentId, string>
    PIPELINE_AGENT_ORDER.forEach((id) => { initStatuses[id] = 'idle' })
    setAgentStatuses(initStatuses)

    const res = await fetch('/api/admin/agents/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishStatus }),
    })

    if (!res.body) { setRunning(false); return }

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
          if (event.type === 'pipeline_done' || event.type === 'pipeline_error') {
            setRunning(false)
          }
        } catch {}
      }
    }
    setRunning(false)
  }

  if (loading) return <div className="p-6 text-gray-500">Carregando agentes...</div>

  return (
    <section className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Pipeline runner */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-1">Executar Pipeline de Agentes</h2>
        <p className="text-sm text-gray-500 mb-4">Aciona todos os agentes em sequência para gerar e publicar um artigo automaticamente.</p>

        {/* Triggers */}
        <div className="mb-4 max-w-xs">
          <label className="block text-xs font-medium text-gray-700 mb-1">Publicar como</label>
          <select
            value={publishStatus}
            onChange={(e) => setPublishStatus(e.target.value as 'published' | 'draft')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            disabled={running}
          >
            <option value="published">Publicado</option>
            <option value="draft">Rascunho</option>
          </select>
        </div>

        {/* Agent progress */}
        {(running || logs.length > 0) && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {PIPELINE_AGENT_ORDER.map((agentId) => {
                const status = agentStatuses[agentId] ?? 'idle'
                return (
                  <div
                    key={agentId}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
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

            <div className="bg-gray-950 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs text-gray-300 space-y-0.5">
              {logs.map((ev, i) => (
                <div key={i} className={
                  ev.type === 'pipeline_done' ? 'text-green-400'
                  : ev.type === 'pipeline_error' || ev.type === 'agent_error' ? 'text-red-400'
                  : ev.type === 'agent_retry' ? 'text-yellow-400'
                  : ev.type === 'agent_done' ? 'text-green-300'
                  : 'text-gray-300'
                }>
                  [{ev.timestamp.slice(11, 19)}] {ev.agent ? `[${ev.agent}] ` : ''}{ev.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        <button
          onClick={runPipeline}
          disabled={running}
          className="px-5 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {running ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Gerando artigo...
            </>
          ) : (
            '▶ Gerar Artigo com Agentes'
          )}
        </button>
      </div>

      {/* Agent config cards */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-1">Configuração dos Agentes</h2>
        <p className="text-sm text-gray-500 mb-4">Configure o prompt e o modelo LLM de cada agente individualmente.</p>

        <div className="space-y-3">
          {configs.map((cfg, idx) => (
            <div key={cfg.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                onClick={() => setExpandedAgent(expandedAgent === cfg.id ? null : cfg.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400 w-5 text-center">{idx + 1}</span>
                  <div>
                    <span className="font-medium text-sm text-neutral-900">{cfg.label}</span>
                    <span className="ml-2 text-xs text-gray-400">{cfg.description}</span>
                  </div>
                </div>
                <span className="text-gray-400 text-xs">{expandedAgent === cfg.id ? '▲' : '▼'}</span>
              </button>

              {expandedAgent === cfg.id && (
                <div className="p-4 space-y-4">
                  {/* Model selector */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {cfg.supportsImageModel ? 'Modelo de Imagem' : 'Modelo LLM'}
                    </label>
                    {(() => {
                      const modelList = cfg.supportsImageModel ? imageModels : models
                      return (
                        <>
                          <input
                            type="text"
                            value={modelDropdownOpen === cfg.id ? (modelSearch[cfg.id] ?? '') : (modelList.find(m => m.id === cfg.model)?.name ?? cfg.model)}
                            onChange={(e) => {
                              setModelSearch(prev => ({ ...prev, [cfg.id]: e.target.value }))
                              setModelDropdownOpen(cfg.id)
                            }}
                            onFocus={() => {
                              setModelSearch(prev => ({ ...prev, [cfg.id]: '' }))
                              setModelDropdownOpen(cfg.id)
                            }}
                            onBlur={() => setTimeout(() => setModelDropdownOpen(null), 150)}
                            placeholder="Buscar modelo..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          />
                          {modelDropdownOpen === cfg.id && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {(modelList.length > 0
                                ? modelList.filter(m => {
                                    const q = (modelSearch[cfg.id] ?? '').toLowerCase()
                                    return !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
                                  })
                                : [{ id: cfg.model, name: cfg.model }]
                              ).slice(0, 50).map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onMouseDown={() => {
                                    updateConfig(cfg.id, { model: m.id })
                                    setModelDropdownOpen(null)
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 truncate ${m.id === cfg.model ? 'bg-brand-primary/5 text-brand-primary font-medium' : 'text-gray-700'}`}
                                >
                                  <span className="font-medium">{m.name}</span>
                                  <span className="text-gray-400 ml-1">{m.id}</span>
                                </button>
                              ))}
                              {modelList.filter(m => {
                                const q = (modelSearch[cfg.id] ?? '').toLowerCase()
                                return !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
                              }).length === 0 && (
                                <div className="px-3 py-2 text-xs text-gray-400">Nenhum modelo encontrado</div>
                              )}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  {/* Firecrawl toggle — researcher and analyst only */}
                  {(cfg.id === 'researcher' || cfg.id === 'analyst') && firecrawlConfigured && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-orange-900">
                          Usar Firecrawl
                        </p>
                        <p className="text-xs text-orange-700 mt-0.5">
                          {cfg.id === 'researcher'
                            ? 'Busca real na web via Firecrawl em vez do Jina Search'
                            : 'Extração de conteúdo via Firecrawl em vez do Jina Reader'}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={savingExtra === cfg.id}
                        onClick={() => toggleFirecrawl(cfg.id, !(agentsExtra[cfg.id]?.use_firecrawl ?? false))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                          agentsExtra[cfg.id]?.use_firecrawl ? 'bg-orange-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            agentsExtra[cfg.id]?.use_firecrawl ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Reviewer enabled toggle — reviewer only */}
                  {cfg.id === 'reviewer' && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-blue-900">
                          Habilitar Revisor
                        </p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Quando desativado, o artigo vai direto do copywriter para o CTA sem revisão
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={savingExtra === 'reviewer'}
                        onClick={() => toggleReviewer(!(agentsExtra['reviewer']?.reviewer_enabled ?? true))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                          (agentsExtra['reviewer']?.reviewer_enabled ?? true) ? 'bg-brand-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            (agentsExtra['reviewer']?.reviewer_enabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Fonte da Imagem de Capa — designer only, sempre visível */}
                  {cfg.id === 'designer' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-medium text-green-900 mb-2">Fonte da Imagem de Capa</p>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={savingExtra === 'designer'}
                          onClick={() => setImageSource('ai')}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                            (agentsExtra['designer']?.image_source ?? 'pexels') === 'ai'
                              ? 'bg-brand-primary text-white border-brand-primary'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          🤖 Gerar com IA
                        </button>
                        <button
                          type="button"
                          disabled={savingExtra === 'designer' || !pexelsConfigured}
                          onClick={() => pexelsConfigured && setImageSource('pexels')}
                          title={pexelsConfigured ? undefined : 'Configure a chave Pexels em Configurações para usar esta opção'}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                            agentsExtra['designer']?.image_source === 'pexels'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          } ${!pexelsConfigured ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          📷 Buscar no Pexels
                        </button>
                        <button
                          type="button"
                          disabled={savingExtra === 'designer'}
                          onClick={() => setImageSource('code')}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                            agentsExtra['designer']?.image_source === 'code'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Gerar por codigo (SVG)
                        </button>
                      </div>

                      {/* Sub-seletor de estilo — visível apenas quando code está selecionado */}
                      {agentsExtra['designer']?.image_source === 'code' && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-xs font-medium text-green-800 mb-2">Estilo do SVG</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={savingExtra === 'designer'}
                              onClick={() => setCodeStyle('gradient')}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                                (agentsExtra['designer']?.code_style ?? 'gradient') === 'gradient'
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              Gradiente + titulo
                            </button>
                            <button
                              type="button"
                              disabled={savingExtra === 'designer'}
                              onClick={() => setCodeStyle('geometric')}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                                agentsExtra['designer']?.code_style === 'geometric'
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              Padrao geometrico
                            </button>
                          </div>
                          <p className="text-xs text-green-700 mt-2">
                            {(agentsExtra['designer']?.code_style ?? 'gradient') === 'geometric'
                              ? 'Formas geometricas abstratas derivadas deterministicamente do titulo do artigo. Sem texto.'
                              : 'Card com gradiente nas cores do sistema, titulo em destaque e label da categoria.'}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-green-700 mt-2">
                        {agentsExtra['designer']?.image_source === 'pexels'
                          ? 'O agente vai gerar uma query de busca e encontrar uma foto relacionada no Pexels.'
                          : agentsExtra['designer']?.image_source === 'code'
                          ? 'A capa e gerada localmente em SVG — sem IA, sem custo externo, usando as cores do sistema.'
                          : 'O agente vai gerar um prompt e criar a imagem via modelo de IA.'}
                      </p>
                    </div>
                  )}

                  {/* Prompt editor */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">System Prompt</label>
                      <button
                        onClick={() => generatePrompt(cfg.id)}
                        disabled={generating === cfg.id}
                        className="flex items-center gap-1 text-xs text-brand-primary hover:text-blue-700 disabled:opacity-50"
                      >
                        {generating === cfg.id ? (
                          <span className="animate-spin inline-block w-3 h-3 border border-brand-primary border-t-transparent rounded-full" />
                        ) : (
                          <span>✨</span>
                        )}
                        Gerar com IA
                      </button>
                    </div>
                    <textarea
                      value={cfg.prompt}
                      onChange={(e) => updateConfig(cfg.id, { prompt: e.target.value })}
                      rows={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono resize-y"
                      placeholder="System prompt do agente..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => saveConfig(cfg.id)}
                      disabled={saving === cfg.id}
                      className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving === cfg.id ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
