'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface ArticleTheme {
  id: number
  title: string
  description: string | null
  source: string
  status: string
}

type WizardStep =
  | 'welcome'
  | 'api_key'
  | 'briefing'
  | 'themes'
  | 'generate'
  | 'success'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// Steps in order — used to determine progress bar width and skip logic
const STEP_ORDER: WizardStep[] = ['welcome', 'api_key', 'briefing', 'themes', 'generate', 'success']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingWizard() {
  const router = useRouter()

  // Modal visibility
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Wizard step
  const [step, setStep] = useState<WizardStep>('welcome')

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Step: api_key
  const [apiKey, setApiKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  // Step: briefing
  const [briefingUrl, setBriefingUrl] = useState('')
  const [briefingContent, setBriefingContent] = useState('')
  const [generatingBriefing, setGeneratingBriefing] = useState(false)

  // Step: themes
  const [themes, setThemes] = useState<ArticleTheme[]>([])
  const [loadingThemes, setLoadingThemes] = useState(false)
  const [generatingThemes, setGeneratingThemes] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<ArticleTheme | null>(null)

  // Step: generate (pipeline)
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentId, string>>({} as Record<AgentId, string>)
  const [logs, setLogs] = useState<PipelineEvent[]>([])
  const [pipelineDone, setPipelineDone] = useState(false)
  const [pipelineError, setPipelineError] = useState(false)
  const [finalPostId, setFinalPostId] = useState<number | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function persistStep(s: WizardStep) {
    const idx = STEP_ORDER.indexOf(s)
    fetch('/api/admin/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: idx }),
    }).catch(() => { /* fire-and-forget */ })
  }

  function goToStep(s: WizardStep) {
    setStep(s)
    persistStep(s)
  }

  function initAgentStatuses() {
    const init = {} as Record<AgentId, string>
    PIPELINE_AGENT_ORDER.forEach((id) => { init[id] = 'idle' })
    setAgentStatuses(init)
  }

  // ---------------------------------------------------------------------------
  // Mount: check onboarding state
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const [stateRes, statusRes] = await Promise.all([
          fetch('/api/admin/onboarding'),
          fetch('/api/admin/onboarding/status'),
        ])
        const state = await stateRes.json() as { completed: boolean; step: number }
        const status = await statusRes.json() as {
          hasApiKey: boolean
          hasBriefing: boolean
          themesCount: number
          hasFirstArticle: boolean
        }

        // Only show if not completed AND (no api key OR no first article)
        if (state.completed || (status.hasApiKey && status.hasFirstArticle)) {
          setLoading(false)
          return
        }

        // Determine the first step not yet satisfied
        let startStep: WizardStep = 'welcome'
        if (status.hasApiKey && status.hasBriefing && status.themesCount > 0) {
          startStep = 'generate'
        } else if (status.hasApiKey && status.hasBriefing) {
          startStep = 'themes'
        } else if (status.hasApiKey) {
          startStep = 'briefing'
        } else {
          startStep = 'api_key'
        }

        // If the persisted step is further along and not 'welcome', use it
        const persistedStep = STEP_ORDER[state.step] as WizardStep | undefined
        if (
          persistedStep &&
          persistedStep !== 'welcome' &&
          STEP_ORDER.indexOf(persistedStep) >= STEP_ORDER.indexOf(startStep)
        ) {
          startStep = persistedStep
        }

        setStep(startStep)
        setOpen(true)
      } catch {
        // Fail silently — do not block admin
      } finally {
        setLoading(false)
      }
    }

    checkOnboarding()
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Load themes when entering themes step
  useEffect(() => {
    if (step === 'themes') {
      loadThemes()
    }
  }, [step])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function handleSkip() {
    await fetch('/api/admin/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    setOpen(false)
  }

  async function handleSaveApiKey() {
    if (!apiKey.trim()) {
      showToast('error', 'Informe a chave da API do OpenRouter')
      return
    }
    setSavingKey(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai: { api_key: apiKey.trim() } }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        showToast('error', data.error || 'Erro ao salvar chave')
        return
      }
      showToast('success', 'Chave salva com sucesso')
      goToStep('briefing')
    } catch {
      showToast('error', 'Erro ao salvar chave da API')
    } finally {
      setSavingKey(false)
    }
  }

  async function handleGenerateBriefing() {
    if (!briefingUrl.trim()) {
      showToast('error', 'Informe a URL do site da empresa')
      return
    }
    setGeneratingBriefing(true)
    try {
      const res = await fetch('/api/admin/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: briefingUrl.trim() }),
      })
      const data = await res.json() as { briefing?: string; error?: string }
      if (!res.ok) {
        showToast('error', data.error || 'Erro ao gerar briefing')
        return
      }
      setBriefingContent(data.briefing ?? '')
      showToast('success', 'Briefing gerado com sucesso')
    } catch {
      showToast('error', 'Erro ao gerar briefing. Verifique a URL e tente novamente.')
    } finally {
      setGeneratingBriefing(false)
    }
  }

  async function handleSaveBriefingAndAdvance() {
    if (!briefingContent.trim()) {
      showToast('error', 'Gere ou escreva o briefing antes de avançar')
      return
    }
    try {
      const res = await fetch('/api/admin/briefing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: briefingUrl, briefing: briefingContent }),
      })
      if (!res.ok) {
        showToast('error', 'Erro ao salvar briefing')
        return
      }
      goToStep('themes')
    } catch {
      showToast('error', 'Erro ao salvar briefing')
    }
  }

  async function loadThemes() {
    setLoadingThemes(true)
    try {
      const res = await fetch('/api/admin/themes')
      const data = await res.json() as { themes?: ArticleTheme[] }
      setThemes(data.themes ?? [])
    } catch {
      setThemes([])
    } finally {
      setLoadingThemes(false)
    }
  }

  async function handleGenerateThemes() {
    setGeneratingThemes(true)
    try {
      const res = await fetch('/api/admin/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      })
      const data = await res.json() as { themes?: ArticleTheme[]; error?: string }
      if (!res.ok) {
        showToast('error', data.error || 'Erro ao gerar temas')
        return
      }
      setThemes(data.themes ?? [])
      showToast('success', `${data.themes?.length ?? 0} temas gerados`)
    } catch {
      showToast('error', 'Erro ao gerar temas')
    } finally {
      setGeneratingThemes(false)
    }
  }

  async function handleStartGenerate() {
    if (!selectedTheme) {
      showToast('error', 'Selecione um tema antes de continuar')
      return
    }
    goToStep('generate')
    await runPipeline()
  }

  async function runPipeline() {
    if (!selectedTheme) return

    setLogs([])
    setPipelineDone(false)
    setPipelineError(false)
    setFinalPostId(null)
    initAgentStatuses()

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    let res: Response | null = null
    try {
      res = await fetch('/api/admin/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeIds: [selectedTheme.id],
          publishStatus: 'draft',
          themeTitle: selectedTheme.title,
          themeDescription: selectedTheme.description ?? undefined,
        }),
        signal: abortController.signal,
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      showToast('error', 'Erro ao conectar com o pipeline')
      setPipelineError(true)
      return
    }

    if (!res || !res.body) {
      showToast('error', 'Falha ao conectar com o pipeline')
      setPipelineError(true)
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
            if (postId) {
              setFinalPostId(postId)
              goToStep('success')
            }
          }
          if (event.type === 'pipeline_error') {
            setPipelineError(true)
            showToast('error', event.message || 'Erro no pipeline de geração')
          }
        } catch { /* ignore malformed SSE lines */ }
      }
    }
  }

  async function handleComplete() {
    await fetch('/api/admin/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    setOpen(false)
  }

  async function handleOpenArticle() {
    if (finalPostId) {
      await handleComplete()
      router.push(`/admin/artigos/${finalPostId}/editar`)
    }
  }

  // ---------------------------------------------------------------------------
  // Progress
  // ---------------------------------------------------------------------------

  const stepIndex = STEP_ORDER.indexOf(step)
  const progressPct = Math.round((stepIndex / (STEP_ORDER.length - 1)) * 100)

  const isRunning = step === 'generate' && !pipelineDone && !pipelineError

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading || !open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[60] px-4 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-secondary">
              Primeiros passos
            </span>
            {!isRunning && (
              <button
                onClick={handleSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Pular por agora
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            {STEP_ORDER.filter((s) => s !== 'success').map((s, i) => (
              <span
                key={s}
                className={`text-[10px] ${stepIndex >= i ? 'text-brand-primary font-medium' : 'text-gray-300'}`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">

          {/* STEP: welcome */}
          {step === 'welcome' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary">
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Bem-vindo ao seu blog!</h2>
                <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                  Vamos configurar tudo em poucos minutos e gerar seu primeiro artigo com IA. São apenas 5 passos simples.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left text-xs text-gray-500 max-w-xs mx-auto">
                {[
                  'Conectar API de IA',
                  'Briefing da empresa',
                  'Gerar temas',
                  'Criar primeiro artigo',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-brand-primary">{i + 1}</span>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <button
                onClick={() => goToStep('api_key')}
                className="w-full bg-brand-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                Vamos começar
              </button>
            </div>
          )}

          {/* STEP: api_key */}
          {step === 'api_key' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-1">Chave da API de IA</h2>
                <p className="text-sm text-gray-500">
                  Insira sua chave do{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary underline"
                  >
                    OpenRouter
                  </a>
                  . Ela será armazenada com segurança no banco de dados.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Chave API
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                  placeholder="sk-or-..."
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                />
              </div>

              <button
                onClick={handleSaveApiKey}
                disabled={savingKey || !apiKey.trim()}
                className="w-full bg-brand-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingKey ? 'Salvando...' : 'Salvar e continuar'}
              </button>
            </div>
          )}

          {/* STEP: briefing */}
          {step === 'briefing' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-1">Briefing da empresa</h2>
                <p className="text-sm text-gray-500">
                  Informe o site da sua empresa. A IA vai analisar o conteúdo e criar um briefing estratégico para guiar a geração dos artigos.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  URL do site
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={briefingUrl}
                    onChange={(e) => setBriefingUrl(e.target.value)}
                    placeholder="https://suaempresa.com.br"
                    autoFocus
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <button
                    onClick={handleGenerateBriefing}
                    disabled={generatingBriefing || !briefingUrl.trim()}
                    className="shrink-0 bg-brand-secondary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {generatingBriefing ? 'Gerando...' : 'Gerar briefing'}
                  </button>
                </div>
              </div>

              {generatingBriefing && (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              )}

              {briefingContent && !generatingBriefing && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Briefing gerado (edite se necessário)
                  </label>
                  <textarea
                    value={briefingContent}
                    onChange={(e) => setBriefingContent(e.target.value)}
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                </div>
              )}

              <button
                onClick={handleSaveBriefingAndAdvance}
                disabled={!briefingContent.trim() || generatingBriefing}
                className="w-full bg-brand-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar e continuar
              </button>
            </div>
          )}

          {/* STEP: themes */}
          {step === 'themes' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-1">Temas para o blog</h2>
                <p className="text-sm text-gray-500">
                  A IA vai sugerir temas relevantes com base no briefing da empresa. Selecione um para gerar o primeiro artigo.
                </p>
              </div>

              {themes.length === 0 && !loadingThemes && (
                <button
                  onClick={handleGenerateThemes}
                  disabled={generatingThemes}
                  className="w-full border-2 border-dashed border-brand-primary/30 text-brand-primary py-4 rounded-xl text-sm font-semibold hover:bg-brand-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingThemes ? 'Gerando temas...' : 'Gerar temas com IA'}
                </button>
              )}

              {(loadingThemes || generatingThemes) && (
                <div className="space-y-2 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              )}

              {themes.length > 0 && !loadingThemes && !generatingThemes && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{themes.length} temas disponíveis</span>
                    <button
                      onClick={handleGenerateThemes}
                      disabled={generatingThemes}
                      className="text-xs text-brand-primary font-medium hover:underline disabled:opacity-50"
                    >
                      Gerar mais
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {themes.map((theme) => (
                      <label
                        key={theme.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedTheme?.id === theme.id
                            ? 'border-brand-primary bg-brand-primary/5'
                            : 'border-gray-200 hover:border-brand-primary/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          value={theme.id}
                          checked={selectedTheme?.id === theme.id}
                          onChange={() => setSelectedTheme(theme)}
                          className="mt-0.5 accent-brand-primary shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 leading-snug">{theme.title}</p>
                          {theme.description && (
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{theme.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={handleStartGenerate}
                disabled={!selectedTheme || generatingThemes || loadingThemes}
                className="w-full bg-brand-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Gerar primeiro artigo
              </button>
            </div>
          )}

          {/* STEP: generate (pipeline) */}
          {step === 'generate' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-1">
                  {pipelineDone ? 'Artigo gerado!' : pipelineError ? 'Erro no pipeline' : 'Gerando artigo...'}
                </h2>
                <p className="text-sm text-gray-500">
                  {pipelineDone
                    ? 'O artigo foi salvo como rascunho.'
                    : pipelineError
                    ? 'Ocorreu um erro. Veja o log abaixo.'
                    : 'O pipeline de agentes está trabalhando. Isso pode levar alguns minutos.'}
                </p>
              </div>

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
              <div className="bg-gray-950 rounded-lg p-3 h-44 overflow-y-auto font-mono text-xs text-gray-300 space-y-0.5">
                {logs.map((ev, i) => (
                  <div
                    key={i}
                    className={
                      ev.type === 'pipeline_done' ? 'text-green-400'
                      : ev.type === 'pipeline_error' || ev.type === 'agent_error' ? 'text-red-400'
                      : ev.type === 'agent_retry' ? 'text-yellow-400'
                      : ev.type === 'agent_done' ? 'text-green-300'
                      : 'text-gray-400'
                    }
                  >
                    [{ev.timestamp.slice(11, 19)}] {ev.agent ? `[${ev.agent}] ` : ''}{ev.message}
                  </div>
                ))}
                {isRunning && <div className="text-gray-500 animate-pulse">▌</div>}
                <div ref={logsEndRef} />
              </div>

              {isRunning && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full" />
                  Pipeline em execução, aguarde...
                </div>
              )}

              {pipelineError && (
                <div className="space-y-3">
                  <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                    Erro no pipeline. Veja o log acima para detalhes.
                  </div>
                  <button
                    onClick={() => runPipeline()}
                    className="w-full border border-brand-primary text-brand-primary py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-primary/5 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP: success */}
          {step === 'success' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto text-4xl">
                🎉
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Primeiro artigo criado!</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Seu artigo foi salvo como rascunho. Abra o editor para revisar, ajustar e publicar quando quiser.
                </p>
              </div>

              <div className="space-y-3">
                {finalPostId && (
                  <button
                    onClick={handleOpenArticle}
                    className="w-full bg-brand-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Abrir no editor
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={handleComplete}
                  className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Concluir configuração
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
