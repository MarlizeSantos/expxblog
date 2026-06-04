'use client'

import {
  IconBlog,
  IconEmpresa,
  IconRedes,
  IconIA,
  IconAILogs,
  IconFirecrawl,
  IconImagem,
  IconChaves,
  IconTelegram,
  IconVercel,
  IconBancoDados,
  IconNewsletter,
} from '@/components/admin/icons/ExpxIcons'

import { useState, useEffect, type ReactNode } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
import { Button } from '@/components/ui/Button'
import { ModelCombobox } from '@/components/ui/ModelCombobox'
import type { CompanyInfo, LgpdSettings, FacebookPixelConfig } from '@/lib/settings'
import type { SeoSettings } from '@/lib/seo'

const DEFAULT_SEO: SeoSettings = {
  default_author: '',
  default_og_image: '',
  twitter_handle: '',
  google_site_verification: '',
  allow_ai_crawlers: true,
}
import WebhooksSection from '@/components/admin/WebhooksSection'
import { AdminFormActions } from '@/components/admin/AdminFormActions'

interface AISettings {
  api_key: string
  models: Record<string, string>
}

interface TelegramSettings {
  bot_token: string
  allowed_chat_ids: string
}

interface FirecrawlSettings {
  api_key: string
}

interface PexelsSettings {
  api_key: string
}

interface ResendSettings {
  api_key: string
  from_email: string
  auto_send: boolean
}

interface ChatAssistantConfig {
  system_prompt: string
  enabled_tools: boolean
}

interface AdSenseSettings {
  enabled: boolean
  publisher_id: string
}

interface Props {
  initial: CompanyInfo
  initialAI: AISettings
  initialTelegram: TelegramSettings
  initialFirecrawl: FirecrawlSettings
  initialPexels: PexelsSettings
  initialResend: ResendSettings
  initialLgpd: LgpdSettings
  initialChatAssistant: ChatAssistantConfig
  initialAdSense: AdSenseSettings
  initialFacebookPixel: FacebookPixelConfig
  initialSeo?: SeoSettings
}

type LgpdCheckItem = {
  id: string
  label: string
  ok: boolean
  detail: string
}

type CompanyKey = keyof CompanyInfo
type SectionId = 'blog' | 'empresa' | 'redes' | 'seo' | 'ia' | 'ai-logs' | 'chat' | 'firecrawl' | 'pexels' | 'resend' | 'api' | 'telegram' | 'vercel' | 'banco' | 'webhooks' | 'lgpd' | 'facebook-pixel' | 'adsense'

interface RemoteModel {
  id: string
  name: string
}

const FEATURE_LABELS: Record<string, string> = {
  image_description: 'Descrição de Imagens',
  briefing_generation: 'Geração de Briefing',
  prompt_generation: 'Geração de Prompts',
  theme_suggestion: 'Sugestão de Temas',
  category_matching: 'Correspondência de Categorias',
  url_extraction: 'Extração de URLs (Crawler)',
  briefing_extraction: 'Extração de dados do briefing',
  chat_assistant: 'Assistente de Chat',
}

// Features que não aparecem na UI — o modelo é gerenciado pelo agente equivalente
const AGENT_MANAGED_FEATURES = new Set(['content_generation', 'image_generation'])

const SIDEBAR_ITEMS: { id: SectionId; label: string; icon: ReactNode }[] = [
  { id: 'blog', label: 'Blog', icon: <IconBlog /> },
  { id: 'empresa', label: 'Dados da Empresa', icon: <IconEmpresa /> },
  { id: 'redes', label: 'Redes Sociais', icon: <IconRedes /> },
  { id: 'seo', label: 'SEO & IA', icon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ) },
  { id: 'ia', label: 'IA (OpenRouter)', icon: <IconIA /> },
  { id: 'ai-logs', label: 'Logs de IA', icon: <IconAILogs /> },
  { id: 'chat', label: 'Assistente de Chat', icon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ) },
  { id: 'firecrawl', label: 'Firecrawl', icon: <IconFirecrawl /> },
  { id: 'pexels', label: 'Pexels', icon: <IconImagem /> },
  { id: 'resend', label: 'Resend (Email)', icon: <IconNewsletter /> },
  { id: 'api', label: 'API', icon: <IconChaves /> },
  { id: 'telegram', label: 'Telegram Bot', icon: <IconTelegram /> },
  { id: 'vercel', label: 'Plano Vercel', icon: <IconVercel /> },
  { id: 'banco', label: 'Banco de Dados', icon: <IconBancoDados /> },
  { id: 'webhooks', label: 'Webhooks', icon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  ) },
  { id: 'adsense', label: 'Google AdSense', icon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ) },
  { id: 'lgpd', label: 'LGPD', icon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ) },
  { id: 'facebook-pixel', label: 'Facebook Pixel', icon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ) },
]

const SECTIONS: Record<string, { fields: { key: CompanyKey; label: string; type?: string; placeholder?: string; multiline?: boolean }[] }> = {
  blog: {
    fields: [
      { key: 'blog_name', label: 'Nome do Blog', placeholder: 'Ex: Meu Blog' },
      { key: 'blog_description', label: 'Descrição do Blog', placeholder: 'Uma breve descrição sobre o blog...', multiline: true },
    ],
  },
  empresa: {
    fields: [
      { key: 'company_name', label: 'Nome da Empresa', placeholder: 'Ex: Minha Empresa Ltda' },
      { key: 'company_cnpj', label: 'CNPJ', placeholder: '00.000.000/0001-00' },
      { key: 'company_email', label: 'E-mail de Contato', type: 'email', placeholder: 'contato@empresa.com.br' },
      { key: 'company_phone', label: 'Telefone', placeholder: '(00) 00000-0000' },
      { key: 'company_address', label: 'Endereço', placeholder: 'Rua Exemplo, 123 - Cidade/UF', multiline: true },
    ],
  },
  redes: {
    fields: [
      { key: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/suaempresa' },
      { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/suaempresa' },
      { key: 'social_twitter', label: 'Twitter / X', placeholder: 'https://x.com/suaempresa' },
      { key: 'social_youtube', label: 'YouTube', placeholder: 'https://youtube.com/@seucanal' },
    ],
  },
}

export function ConfiguracoesClient({ initial, initialAI, initialTelegram, initialFirecrawl, initialPexels, initialResend, initialLgpd, initialChatAssistant, initialAdSense, initialFacebookPixel, initialSeo }: Props) {
  const [company, setCompany] = useState<CompanyInfo>(initial)
  const [ai, setAI] = useState<AISettings>(initialAI)
  const [telegram, setTelegram] = useState<TelegramSettings>(initialTelegram)
  const [firecrawl, setFirecrawl] = useState<FirecrawlSettings>(initialFirecrawl)
  const [pexels, setPexels] = useState<PexelsSettings>(initialPexels)
  const [resend, setResend] = useState<ResendSettings>(initialResend)
  const [chatAssistant, setChatAssistant] = useState<ChatAssistantConfig>(initialChatAssistant)
  const [adsense, setAdSense] = useState<AdSenseSettings>(initialAdSense)
  const [adsenseSaving, setAdSenseSaving] = useState(false)
  const [facebookPixel, setFacebookPixel] = useState<FacebookPixelConfig>(initialFacebookPixel)
  const [facebookPixelSaving, setFacebookPixelSaving] = useState(false)
  const [newPixelId, setNewPixelId] = useState('')
  const [seo, setSeo] = useState<SeoSettings>(initialSeo ?? DEFAULT_SEO)
  const [seoSaving, setSeoSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [lgpd, setLgpd] = useState<LgpdSettings>(initialLgpd)
  const [lgpdSaving, setLgpdSaving] = useState(false)
  const [lgpdStatus, setLgpdStatus] = useState<LgpdCheckItem[] | null>(null)
  const [lgpdStatusLoading, setLgpdStatusLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [activeSection, setActiveSection] = useState<SectionId>('blog')
  const [availableModels, setAvailableModels] = useState<RemoteModel[]>([])
  const [availableImageModels, setAvailableImageModels] = useState<RemoteModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [webhookLoading, setWebhookLoading] = useState(false)
  const [vercelMaxDuration, setVercelMaxDuration] = useState<number>(300)
  const [vercelSaving, setVercelSaving] = useState(false)
  const [vercelDeploy, setVercelDeploy] = useState<number | null>(null)
  const [dbMigrateState, setDbMigrateState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [dbLogs, setDbLogs] = useState<{ text: string; color: 'green' | 'white' | 'red' }[]>([])

  // DB connection state
  const [dbUrlInput, setDbUrlInput] = useState('')
  const [dbUrlMasked, setDbUrlMasked] = useState<string | null>(null)
  const [dbUrlSource, setDbUrlSource] = useState<'env' | 'custom' | null>(null)
  const [dbTestState, setDbTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [dbTestMsg, setDbTestMsg] = useState('')
  const [dbSaveState, setDbSaveState] = useState<'idle' | 'saving'>('idle')
  const [dbMode, setDbMode] = useState<'session' | 'transaction' | 'direct' | null>(null)
  const [dbModeSaving, setDbModeSaving] = useState(false)

  // AI Logs state
  type AiLogEntry = {
    id: number
    feature: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    cost_usd: number
    cost_brl: number | null
    usd_brl_rate: number | null
    status: string
    error: string | null
    duration_ms: number | null
    created_at: string
  }
  type AiStats = {
    period: string
    totals: {
      total_requests: number
      total_tokens: number
      total_cost_usd: number
      total_cost_brl: number | null
      success_count: number
      error_count: number
      avg_duration_ms: number
    }
    by_feature: { feature: string; request_count: number; total_tokens: number; total_cost_usd: number; total_cost_brl: number | null }[]
    by_model: { model: string; request_count: number; total_tokens: number; total_cost_usd: number; total_cost_brl: number | null }[]
  }
  const [aiLogs, setAiLogs] = useState<AiLogEntry[]>([])
  const [aiLogsTotal, setAiLogsTotal] = useState(0)
  const [aiLogsPage, setAiLogsPage] = useState(1)
  const [aiLogsPages, setAiLogsPages] = useState(1)
  const [aiLogsPeriod, setAiLogsPeriod] = useState('7d')
  const [aiLogsLoading, setAiLogsLoading] = useState(false)
  const [aiStats, setAiStats] = useState<AiStats | null>(null)
  const [aiStatsLoading, setAiStatsLoading] = useState(false)

  const IMAGE_FEATURES = new Set(['image_generation'])

  useEffect(() => {
    setModelsLoading(true)
    Promise.all([
      fetch('/api/admin/ai/models').then((res) => (res.ok ? res.json() : [])),
      fetch('/api/admin/ai/image-models').then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([chatModels, imageModels]: [RemoteModel[], RemoteModel[]]) => {
        setAvailableModels(chatModels)
        setAvailableImageModels(imageModels)
      })
      .catch(() => {
        setAvailableModels([])
        setAvailableImageModels([])
      })
      .finally(() => setModelsLoading(false))
  }, [])

  useEffect(() => {
    if (activeSection === 'ai-logs') {
      void fetchAiLogs(aiLogsPeriod, 1)
      void fetchAiStats(aiLogsPeriod)
    }
    if (activeSection === 'vercel') {
      fetch('/api/admin/settings/vercel-max-duration')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setVercelMaxDuration(d.value) })
        .catch(() => {})
    }
    if (activeSection === 'banco') {
      fetch('/api/admin/settings/database-url')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { masked: string; source: 'env' | 'custom'; mode: 'session' | 'transaction' | 'direct' | null } | null) => {
          if (d) {
            setDbUrlMasked(d.masked)
            setDbUrlSource(d.source)
            setDbMode(d.mode)
          }
        })
        .catch(() => {})
    }
    if (activeSection === 'lgpd') {
      setLgpdStatusLoading(true)
      fetch('/api/admin/lgpd/status')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { checks: LgpdCheckItem[] } | null) => {
          if (d) setLgpdStatus(d.checks)
        })
        .catch(() => {})
        .finally(() => setLgpdStatusLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection])

  async function fetchAiLogs(period: string, page: number) {
    setAiLogsLoading(true)
    try {
      const res = await fetch(`/api/admin/ai-logs?period=${period}&page=${page}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setAiLogs(data.data)
        setAiLogsTotal(data.total)
        setAiLogsPage(data.page)
        setAiLogsPages(data.pages)
      }
    } finally {
      setAiLogsLoading(false)
    }
  }

  async function fetchAiStats(period: string) {
    setAiStatsLoading(true)
    try {
      const res = await fetch(`/api/admin/ai-logs/stats?period=${period}`)
      if (res.ok) {
        const data = await res.json()
        setAiStats(data)
      }
    } finally {
      setAiStatsLoading(false)
    }
  }

  function handleAiLogsPeriodChange(period: string) {
    setAiLogsPeriod(period)
    setAiLogsPage(1)
    void fetchAiLogs(period, 1)
    void fetchAiStats(period)
  }

  function handleChange(key: CompanyKey, value: string) {
    setCompany((prev) => ({ ...prev, [key]: value }))
  }

  function handleAIKeyChange(value: string) {
    setAI((prev) => ({ ...prev, api_key: value }))
  }

  function handleAIModelChange(feature: string, model: string) {
    setAI((prev) => ({ ...prev, models: { ...prev.models, [feature]: model } }))
  }

  function handleTelegramChange(key: keyof TelegramSettings, value: string) {
    setTelegram((prev) => ({ ...prev, [key]: value }))
  }

  function handleFirecrawlKeyChange(value: string) {
    setFirecrawl((prev) => ({ ...prev, api_key: value }))
  }

  function handlePexelsKeyChange(value: string) {
    setPexels((prev) => ({ ...prev, api_key: value }))
  }

  function handleLgpdChange<K extends keyof LgpdSettings>(key: K, value: LgpdSettings[K]) {
    setLgpd((prev) => ({ ...prev, [key]: value }))
  }

  function handleSeoChange<K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) {
    setSeo((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSeoSave() {
    setSeoSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seo }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Falha ao salvar')
      }
      setToast({ type: 'success', msg: 'Configurações de SEO salvas com sucesso!' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar configurações de SEO.' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSeoSaving(false)
    }
  }

  async function handleLgpdSave() {
    setLgpdSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lgpd }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Falha ao salvar')
      }
      setToast({ type: 'success', msg: 'Configurações LGPD salvas com sucesso!' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar configurações LGPD.' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setLgpdSaving(false)
    }
  }

  function handleResendChange<K extends keyof ResendSettings>(key: K, value: ResendSettings[K]) {
    setResend((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSendTestResend() {
    setSendingTest(true)
    try {
      const res = await fetch('/api/admin/newsletter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha ao enviar e-mail de teste')
      setToast({ type: 'success', msg: 'E-mail de teste enviado!' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao enviar teste.' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSendingTest(false)
    }
  }

  async function handleDbTestConnection() {
    if (!dbUrlInput.trim()) return
    setDbTestState('testing')
    setDbTestMsg('')
    try {
      const res = await fetch('/api/admin/db-test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: dbUrlInput.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setDbTestState('ok')
        setDbTestMsg(`Conexão OK — ${data.latency_ms}ms`)
      } else {
        setDbTestState('error')
        setDbTestMsg(data.error ?? 'Falha na conexão')
      }
    } catch (err) {
      setDbTestState('error')
      setDbTestMsg(err instanceof Error ? err.message : 'Erro ao testar conexão')
    }
  }

  async function handleDbSaveAndMigrate() {
    if (!dbUrlInput.trim() || dbTestState !== 'ok') return
    setDbSaveState('saving')
    try {
      const saveRes = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ database: { url: dbUrlInput.trim() } }),
      })
      if (!saveRes.ok) {
        const d = await saveRes.json()
        throw new Error(d.error ?? 'Falha ao salvar URL do banco')
      }
      // Refresh masked URL display
      const infoRes = await fetch('/api/admin/settings/database-url')
      if (infoRes.ok) {
        const info = await infoRes.json()
        setDbUrlMasked(info.masked)
        setDbUrlSource(info.source)
      }
      setDbUrlInput('')
      setDbTestState('idle')
      setDbTestMsg('')
      // Now run migrations via SSE
      setDbMigrateState('running')
      setDbLogs([{ text: 'Conectando ao novo banco e aplicando migrations...', color: 'white' }])
      type MigrateEvent =
        | { type: 'migration'; name: string; status: 'applying' | 'done' | 'skipped' }
        | { type: 'complete'; message: string }
        | { type: 'error'; name: string; message: string }
      const migrateRes = await fetch('/api/admin/db-migrate', { method: 'POST' })
      if (!migrateRes.body) {
        setDbMigrateState('error')
        setDbLogs((p) => [...p, { text: 'Erro: resposta sem corpo.', color: 'red' }])
        return
      }
      const reader = migrateRes.body.getReader()
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
            const event: MigrateEvent = JSON.parse(line)
            if (event.type === 'migration') {
              if (event.status === 'applying') setDbLogs((p) => [...p, { text: `▸ Aplicando ${event.name}.sql...`, color: 'green' }])
              else if (event.status === 'done') setDbLogs((p) => [...p, { text: `✓ ${event.name}.sql`, color: 'white' }])
            } else if (event.type === 'complete') {
              setDbLogs((p) => [...p, { text: `✓ ${event.message}`, color: 'white' }])
              setDbMigrateState('done')
            } else if (event.type === 'error') {
              setDbLogs((p) => [...p, { text: `✗ ${event.message}`, color: 'red' }])
              setDbMigrateState('error')
            }
          } catch { /* ignora parse error */ }
        }
      }
      setToast({ type: 'success', msg: 'URL salva e migrations aplicadas com sucesso.' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar banco' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setDbSaveState('idle')
    }
  }

  async function handleDbModeChange(mode: 'session' | 'transaction' | 'direct') {
    if (mode === dbMode || dbModeSaving) return
    setDbModeSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ database: { mode } }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao alterar modo de conexão')
      }
      // Recarrega a conexão atual para refletir a nova porta/modo.
      const info = await fetch('/api/admin/settings/database-url').then((r) => (r.ok ? r.json() : null))
      if (info) {
        setDbUrlMasked(info.masked)
        setDbUrlSource(info.source)
        setDbMode(info.mode)
      }
      setToast({ type: 'success', msg: 'Modo de conexão alterado com sucesso.' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao alterar modo de conexão' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setDbModeSaving(false)
    }
  }

  async function handleRegisterWebhook() {
    if (!telegram.bot_token) {
      setToast({ type: 'error', msg: 'Preencha o Token do Bot antes de registrar o webhook.' })
      return
    }
    setWebhookLoading(true)
    setToast(null)
    try {
      // Save telegram settings first so the setup route can read the token from DB
      const saveRes = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram }),
      })
      if (!saveRes.ok) {
        const d = await saveRes.json()
        throw new Error(d.error ?? 'Falha ao salvar configurações')
      }

      const res = await fetch('/api/admin/telegram/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha ao registrar webhook')
      setToast({ type: 'success', msg: `Webhook registrado com sucesso! URL: ${data.webhook_url}` })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao registrar webhook.' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setWebhookLoading(false)
    }
  }

  async function handleVercelSave() {
    setVercelSaving(true)
    setToast(null)
    setVercelDeploy(null)
    try {
      const res = await fetch('/api/admin/settings/vercel-max-duration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: vercelMaxDuration }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Falha ao salvar')
      }
      setVercelDeploy(vercelMaxDuration)
      setToast({ type: 'success', msg: 'Configuração salva! Siga o aviso abaixo para aplicar.' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar configuração.' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setVercelSaving(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, ai, telegram, firecrawl, pexels, resend, chat_assistant: chatAssistant }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Falha ao salvar')
      }
      setToast({ type: 'success', msg: 'Configurações salvas com sucesso!' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar configurações.' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  function renderContent() {
    switch (activeSection) {
      case 'blog':
      case 'empresa':
      case 'redes': {
        const section = SECTIONS[activeSection]
        const title = SIDEBAR_ITEMS.find((i) => i.id === activeSection)!.label
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-5">{title}</h2>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  {field.multiline ? (
                    <textarea
                      value={company[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                    />
                  ) : (
                    <input
                      type={field.type ?? 'text'}
                      value={company[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      }
      case 'seo':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">SEO &amp; Descoberta por IA</h2>
            <p className="text-sm text-gray-500 mb-5">
              Configure metadados Open Graph, Twitter Cards, verificação do Google Search Console e controle
              de acesso de crawlers de IA (GEO/AEO) ao conteúdo do blog.
            </p>
            <div className="space-y-5">
              {/* Autor padrão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Autor padrão</label>
                <input
                  type="text"
                  value={seo.default_author}
                  onChange={(e) => handleSeoChange('default_author', e.target.value)}
                  placeholder="Ex: Equipe do Blog"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Usado em <code className="font-mono">article:author</code> e JSON-LD quando o artigo não tem autor próprio.
                </p>
              </div>

              {/* Imagem OG padrão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagem Open Graph padrão</label>
                <input
                  type="url"
                  value={seo.default_og_image}
                  onChange={(e) => handleSeoChange('default_og_image', e.target.value)}
                  placeholder="https://seudominio.com.br/og-image.jpg"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Imagem exibida ao compartilhar páginas sem capa própria no Facebook, WhatsApp, LinkedIn etc.
                  Recomendado: 1200&times;630 px.
                </p>
              </div>

              {/* Twitter handle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Handle do Twitter/X</label>
                <input
                  type="text"
                  value={seo.twitter_handle}
                  onChange={(e) => handleSeoChange('twitter_handle', e.target.value)}
                  placeholder="@minhaempresa"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Usado na meta tag <code className="font-mono">twitter:site</code> para atribuição nos Twitter Cards.
                </p>
              </div>

              {/* Google site verification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Token do Google Search Console</label>
                <input
                  type="text"
                  value={seo.google_site_verification}
                  onChange={(e) => handleSeoChange('google_site_verification', e.target.value)}
                  placeholder="Ex: abc123def456..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Token da meta tag <code className="font-mono">google-site-verification</code>. Obtido no Google
                  Search Console ao adicionar a propriedade via &ldquo;Tag HTML&rdquo;.
                </p>
              </div>

              {/* Toggle crawlers IA */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">Permitir crawlers de IA</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Controla se GPTBot, ClaudeBot, PerplexityBot e outros crawlers de IA podem acessar o conteúdo
                    via <code className="font-mono">robots.txt</code>. Desativar bloqueia indexação em ferramentas de IA generativa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSeoChange('allow_ai_crawlers', !seo.allow_ai_crawlers)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                    seo.allow_ai_crawlers ? 'bg-brand-primary' : 'bg-gray-300'
                  }`}
                  aria-pressed={seo.allow_ai_crawlers}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      seo.allow_ai_crawlers ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSeoSave()}
                disabled={seoSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {seoSaving ? 'Salvando...' : 'Salvar configurações SEO'}
              </button>
            </div>
          </section>
        )

      case 'ia':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">IA (OpenRouter)</h2>
            <p className="text-sm text-gray-500 mb-5">
              Configure a chave de API do OpenRouter e o modelo LLM usado por cada recurso de IA. Obtenha sua chave em{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">
                openrouter.ai/keys
              </a>
              .
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chave de API</label>
                <input
                  type="password"
                  value={ai.api_key}
                  onChange={(e) => handleAIKeyChange(e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Modelos por Recurso</h3>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs text-blue-800">
                    Os modelos de <strong>Geração de Conteúdo</strong> e <strong>Geração de Imagens</strong> são
                    definidos pelos agentes da pipeline em{' '}
                    <a href="/admin/artigos" className="underline font-medium">Artigos</a>
                    {' '}(agentes Copywriter e Designer), não aqui.
                  </p>
                </div>
                <div className="space-y-4">
                  {Object.entries(ai.models).filter(([feature]) => !AGENT_MANAGED_FEATURES.has(feature)).map(([feature, model]) => (
                    <div key={feature}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {FEATURE_LABELS[feature] ?? feature}
                      </label>
                      <ModelCombobox
                        value={model}
                        onChange={(v) => handleAIModelChange(feature, v)}
                        models={IMAGE_FEATURES.has(feature) ? availableImageModels : availableModels}
                        loading={modelsLoading}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )
      case 'chat':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Assistente de Chat</h2>
            <p className="text-sm text-gray-500 mb-5">
              Configure o assistente de chat do painel admin (ícone &quot;Assistente&quot; na barra superior).
              Ele responde perguntas e executa ações reais no sistema via ferramentas (criar artigos, listar
              posts, consultar analytics, etc.). O modelo usado é definido em{' '}
              <strong>IA (OpenRouter)</strong> &rarr; recurso <strong>Assistente de Chat</strong>.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instruções do assistente (system prompt)</label>
                <textarea
                  value={chatAssistant.system_prompt}
                  onChange={(e) => setChatAssistant((prev) => ({ ...prev, system_prompt: e.target.value }))}
                  rows={10}
                  placeholder="Deixe em branco para usar o prompt padrão do sistema..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono leading-relaxed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Define a personalidade e as diretrizes do assistente. Se vazio, um prompt padrão é usado.
                  Máximo de 5000 caracteres.
                </p>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">Habilitar ferramentas (tools)</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Permite que o assistente execute ações reais (criar/editar/publicar artigos, disparar a
                    pipeline, consultar dados). Se desativado, ele apenas conversa, sem agir no sistema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setChatAssistant((prev) => ({ ...prev, enabled_tools: !prev.enabled_tools }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                    chatAssistant.enabled_tools ? 'bg-brand-primary' : 'bg-gray-300'
                  }`}
                  aria-pressed={chatAssistant.enabled_tools}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      chatAssistant.enabled_tools ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        )
      case 'firecrawl':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Firecrawl</h2>
            <p className="text-sm text-gray-500 mb-5">
              Integração opcional para busca e extração de conteúdo de alta qualidade nos agentes Pesquisador e Analista.
              Obtenha sua chave em{' '}
              <a href="https://www.firecrawl.dev" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">
                firecrawl.dev
              </a>
              . Quando configurada, a opção de ativar o Firecrawl aparece nas configurações de cada agente.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave de API</label>
              <input
                type="password"
                value={firecrawl.api_key}
                onChange={(e) => handleFirecrawlKeyChange(e.target.value)}
                placeholder="fc-..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </section>
        )
      case 'pexels':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Pexels</h2>
            <p className="text-sm text-gray-500 mb-5">
              Integração opcional com o banco de fotos Pexels. Quando configurada, o agente Designer pode buscar uma
              foto relacionada ao artigo em vez de gerar uma imagem via IA. Obtenha sua chave gratuita em{' '}
              <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">
                pexels.com/api
              </a>
              . Após salvar, a opção de fonte aparece nas configurações do agente Designer.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave de API</label>
              <input
                type="password"
                value={pexels.api_key}
                onChange={(e) => handlePexelsKeyChange(e.target.value)}
                placeholder="Sua chave da API Pexels..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </section>
        )
      case 'resend':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Resend (Email)</h2>
            <p className="text-sm text-gray-500 mb-5">
              Configure sua chave da API do Resend para habilitar o envio de e-mails via newsletter. Obtenha sua chave em{' '}
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">
                resend.com
              </a>
              .
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resend API Key</label>
                <input
                  type="password"
                  value={resend.api_key}
                  onChange={(e) => handleResendChange('api_key', e.target.value)}
                  placeholder="re_xxxxxxxxxxxx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Obtenha sua chave em{' '}
                  <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">
                    resend.com
                  </a>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail remetente</label>
                <input
                  type="email"
                  value={resend.from_email}
                  onChange={(e) => handleResendChange('from_email', e.target.value)}
                  placeholder="newsletter@seudominio.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <p className="text-xs text-gray-400 mt-1">Deve ser um domínio verificado no Resend.</p>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">Enviar automaticamente ao publicar</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dispara o e-mail para todos os inscritos ativos sempre que um post for publicado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleResendChange('auto_send', !resend.auto_send)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    resend.auto_send ? 'bg-brand-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      resend.auto_send ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => void handleSendTestResend()}
                  disabled={sendingTest || !resend.api_key || !resend.from_email}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingTest ? 'Enviando...' : 'Enviar e-mail de teste'}
                </button>
                <p className="text-xs text-gray-400 mt-2">Envia um e-mail de teste para o e-mail remetente configurado acima.</p>
              </div>
            </div>
          </section>
        )
      case 'telegram':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Telegram Bot</h2>
            <p className="text-sm text-gray-500 mb-6">
              Envie um tema ou link para o bot e o sistema gera, publica o artigo e devolve o link automaticamente.
            </p>

            {/* Passo a passo */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 space-y-4">
              <p className="text-sm font-semibold text-blue-800">Como configurar — siga a ordem abaixo:</p>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Criar o bot no Telegram</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs">
                    <li>Abra o Telegram e pesquise por <strong>@BotFather</strong></li>
                    <li>Envie o comando <code className="bg-blue-100 px-1 rounded">/newbot</code></li>
                    <li>Digite um nome para o bot (ex: <em>Meu Blog Bot</em>)</li>
                    <li>Digite um username para o bot — deve terminar em <em>bot</em> (ex: <em>meublog_bot</em>)</li>
                    <li>O BotFather vai responder com o <strong>Token</strong> — copie e cole no campo abaixo</li>
                  </ol>
                  <p className="mt-2 text-xs text-blue-700">
                    O token tem o formato: <code className="bg-blue-100 px-1 rounded">123456789:ABCDEFGabcdefg...</code>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Cole o token abaixo e salve</p>
                  <p className="text-xs text-blue-800">Preencha o campo <strong>Token do Bot</strong> e clique em <strong>Salvar alterações</strong> antes de continuar.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Registrar o Webhook</p>
                  <p className="text-xs text-blue-800">Clique no botão <strong>Registrar Webhook</strong> no final desta seção. Isso conecta seu bot ao sistema.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Descobrir seu Chat ID</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs">
                    <li>Abra uma conversa com o seu bot no Telegram (pesquise pelo username que você criou)</li>
                    <li>Envie o comando <code className="bg-blue-100 px-1 rounded">/start</code></li>
                    <li>O bot vai responder com o seu <strong>Chat ID</strong> — copie o número</li>
                    <li>Cole no campo <strong>Chat IDs autorizados</strong> abaixo</li>
                    <li>Salve as configurações novamente</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">✓</span>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Pronto! Como usar</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
                    <li>Envie um <strong>tema</strong> (ex: <em>&ldquo;As tendências de tecnologia para 2025&rdquo;</em>) para gerar um artigo original</li>
                    <li>Envie um <strong>link</strong> (ex: <em>https://exemplo.com/noticia</em>) para reescrever o conteúdo</li>
                    <li>O bot publica o artigo e devolve o link</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Campos */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token do Bot <span className="text-gray-400 font-normal">(obtido no @BotFather — passo 1)</span>
                </label>
                <input
                  type="password"
                  value={telegram.bot_token}
                  onChange={(e) => handleTelegramChange('bot_token', e.target.value)}
                  placeholder="123456789:ABCDEFGabcdefg..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chat IDs autorizados <span className="text-gray-400 font-normal">(obtido no passo 4)</span>
                </label>
                <input
                  type="text"
                  value={telegram.allowed_chat_ids}
                  onChange={(e) => handleTelegramChange('allowed_chat_ids', e.target.value)}
                  placeholder="123456789"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Para autorizar mais de uma pessoa, separe os IDs por vírgula. Deixar vazio permite que qualquer pessoa use o bot — não recomendado.
                </p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  Salve as configurações acima antes de registrar o webhook.
                </p>
                <button
                  type="button"
                  onClick={handleRegisterWebhook}
                  disabled={webhookLoading || !telegram.bot_token}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {webhookLoading ? '⏳ Registrando...' : '🔗 Registrar Webhook'}
                </button>
              </div>
            </div>
          </section>
        )
      case 'ai-logs':
        return (
          <section className="space-y-6">
            {/* KPI Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Logs de IA</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Requisições feitas via OpenRouter</p>
                </div>
                <div className="flex gap-2">
                  {(['today', '7d', '30d'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleAiLogsPeriodChange(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        aiLogsPeriod === p
                          ? 'bg-brand-primary text-white'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p === 'today' ? 'Hoje' : p === '7d' ? '7 dias' : '30 dias'}
                    </button>
                  ))}
                </div>
              </div>

              {aiStatsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : aiStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Requisições</p>
                    <p className="text-2xl font-bold text-neutral-900">{aiStats.totals.total_requests.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="text-green-600">{aiStats.totals.success_count} ok</span>
                      {aiStats.totals.error_count > 0 && (
                        <span className="text-red-500 ml-2">{aiStats.totals.error_count} erros</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Tokens Usados</p>
                    <p className="text-2xl font-bold text-neutral-900">{aiStats.totals.total_tokens.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-gray-400 mt-1">total</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Custo Estimado</p>
                    {aiStats.totals.total_cost_brl != null ? (
                      <>
                        <p className="text-2xl font-bold text-neutral-900">
                          R$ {aiStats.totals.total_cost_brl.toFixed(4)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">${aiStats.totals.total_cost_usd.toFixed(4)} USD</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-neutral-900">
                          ${aiStats.totals.total_cost_usd.toFixed(4)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">USD</p>
                      </>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Tempo Médio</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {aiStats.totals.avg_duration_ms > 0
                        ? `${(aiStats.totals.avg_duration_ms / 1000).toFixed(1)}s`
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">por req.</p>
                  </div>
                </div>
              ) : null}

              {/* Por feature e modelo */}
              {aiStats && aiStats.totals.total_requests > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Por Recurso</h3>
                    <div className="space-y-2">
                      {aiStats.by_feature.slice(0, 5).map((row) => (
                        <div key={row.feature} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 truncate">{row.feature}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-gray-500 text-xs">{row.request_count}x</span>
                            <span className="text-gray-400 text-xs">{row.total_tokens.toLocaleString('pt-BR')} tok</span>
                            {row.total_cost_brl != null ? (
                              <span className="text-gray-400 text-xs" title={`$${row.total_cost_usd.toFixed(4)} USD`}>
                                R$ {row.total_cost_brl.toFixed(4)}
                              </span>
                            ) : row.total_cost_usd > 0 ? (
                              <span className="text-gray-400 text-xs">${row.total_cost_usd.toFixed(4)}</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Por Modelo</h3>
                    <div className="space-y-2">
                      {aiStats.by_model.slice(0, 5).map((row) => (
                        <div key={row.model} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 truncate font-mono text-xs">{row.model}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-gray-500 text-xs">{row.request_count}x</span>
                            {row.total_cost_brl != null ? (
                              <span className="text-gray-400 text-xs" title={`$${row.total_cost_usd.toFixed(4)} USD`}>
                                R$ {row.total_cost_brl.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">${row.total_cost_usd.toFixed(4)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Histórico de Requisições</h3>
              {aiLogsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : aiLogs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum log encontrado para o período selecionado.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 pr-3 font-medium text-gray-500">Horário</th>
                          <th className="text-left py-2 pr-3 font-medium text-gray-500">Recurso</th>
                          <th className="text-left py-2 pr-3 font-medium text-gray-500">Modelo</th>
                          <th className="text-right py-2 pr-3 font-medium text-gray-500">Tokens</th>
                          <th className="text-right py-2 pr-3 font-medium text-gray-500">Custo</th>
                          <th className="text-right py-2 pr-3 font-medium text-gray-500">Tempo</th>
                          <th className="text-center py-2 font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiLogs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2 pr-3 text-gray-700">{log.feature}</td>
                            <td className="py-2 pr-3 text-gray-500 font-mono max-w-[140px] truncate">{log.model}</td>
                            <td className="py-2 pr-3 text-right text-gray-700 tabular-nums">{log.total_tokens.toLocaleString('pt-BR')}</td>
                            <td className="py-2 pr-3 text-right text-gray-700 tabular-nums">
                              {log.cost_brl != null ? (
                                <span title={`$${log.cost_usd.toFixed(5)} USD`}>
                                  R$ {log.cost_brl.toFixed(5)}
                                </span>
                              ) : log.cost_usd > 0 ? (
                                `$${log.cost_usd.toFixed(5)}`
                              ) : '—'}
                            </td>
                            <td className="py-2 pr-3 text-right text-gray-500 tabular-nums">
                              {log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                            </td>
                            <td className="py-2 text-center">
                              {log.status === 'success' ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-100">ok</span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-100" title={log.error ?? ''}>erro</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  {aiLogsPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">{aiLogsTotal} registros no total</p>
                      <div className="flex gap-2">
                        <button
                          disabled={aiLogsPage <= 1}
                          onClick={() => {
                            const newPage = aiLogsPage - 1
                            setAiLogsPage(newPage)
                            void fetchAiLogs(aiLogsPeriod, newPage)
                          }}
                          className="px-3 py-1 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                        >
                          Anterior
                        </button>
                        <span className="px-3 py-1 text-xs text-gray-600">{aiLogsPage} / {aiLogsPages}</span>
                        <button
                          disabled={aiLogsPage >= aiLogsPages}
                          onClick={() => {
                            const newPage = aiLogsPage + 1
                            setAiLogsPage(newPage)
                            void fetchAiLogs(aiLogsPeriod, newPage)
                          }}
                          className="px-3 py-1 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )
      case 'vercel':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Plano Vercel</h2>
            <p className="text-sm text-gray-500 mb-5">
              Define o tempo máximo de execução das funções de longa duração (pipelines de IA, crons de RSS, automação).
              O valor deve corresponder ao plano contratado na Vercel — valores acima do limite do plano são ignorados.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano atual</label>
                <select
                  value={vercelMaxDuration}
                  onChange={(e) => setVercelMaxDuration(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                >
                  <option value={300}>Hobby / Free — 300 segundos</option>
                  <option value={800}>Pro — 800 segundos</option>
                  <option value={900}>Enterprise — 900 segundos</option>
                </select>
              </div>

              {vercelDeploy !== null && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-sm text-amber-900">
                  <p className="font-semibold mb-2">Ação necessária para aplicar a mudança</p>
                  <p className="mb-3">
                    O Next.js exige que <code className="bg-amber-100 px-1 rounded font-mono">maxDuration</code> seja
                    um número literal no código-fonte — não é possível lê-lo de variável de ambiente em runtime.
                    Para aplicar o valor <strong>{vercelDeploy}s</strong>, é necessário alterar o código e fazer deploy.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-800 text-xs">
                    <li>
                      Nas 7 rotas de longa duração do projeto, altere{' '}
                      <code className="bg-amber-100 px-1 rounded font-mono">export const maxDuration = 300</code> para{' '}
                      <code className="bg-amber-100 px-1 rounded font-mono">export const maxDuration = {vercelDeploy}</code>
                    </li>
                    <li>Faça commit e push para o GitHub — a Vercel fará o deploy automaticamente</li>
                  </ol>
                  <p className="mt-3 text-xs text-amber-700">
                    Arquivos a editar: <code className="bg-amber-100 px-1 rounded font-mono">app/api/cron/rss</code>,{' '}
                    <code className="bg-amber-100 px-1 rounded font-mono">app/api/cron/source-crawlers</code>,{' '}
                    <code className="bg-amber-100 px-1 rounded font-mono">app/api/cron/automation</code>,{' '}
                    <code className="bg-amber-100 px-1 rounded font-mono">app/api/admin/rss/check</code>,{' '}
                    <code className="bg-amber-100 px-1 rounded font-mono">app/api/admin/rss/[id]/check</code>,{' '}
                    <code className="bg-amber-100 px-1 rounded font-mono">app/api/admin/rss/items/[itemId]/process</code>,{' '}
                    <code className="bg-amber-100 px-1 rounded font-mono">app/api/admin/agents/run</code>
                  </p>
                </div>
              )}

              <div className="border border-gray-100 bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
                <p className="font-medium text-gray-700 mb-1">Limites por plano</p>
                <ul className="space-y-1">
                  <li><strong>Hobby / Free</strong> — máximo 300s por função</li>
                  <li><strong>Pro</strong> — máximo 800s por função</li>
                  <li><strong>Enterprise</strong> — máximo 900s por função</li>
                </ul>
              </div>
            </div>

            <AdminFormActions>
              <button
                type="button"
                onClick={handleVercelSave}
                disabled={vercelSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {vercelSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </AdminFormActions>
          </section>
        )
      case 'banco':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">Banco de Dados</h2>
              <p className="text-sm text-gray-500">
                Configure a conexão com o banco de dados e aplique migrations pendentes.
              </p>
            </div>

            {/* Current DB URL */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Conexão atual</p>
              {dbUrlMasked ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-neutral-900">{dbUrlMasked}</span>
                  {dbUrlSource === 'custom' && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-medium">customizada</span>
                  )}
                  {dbUrlSource === 'env' && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">variável de ambiente</span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-400 animate-pulse">Carregando...</span>
              )}
            </div>

            {/* Connection mode selector */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Modo de conexão</label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Reescreve a porta da URL atual e reconecta. Para escala em serverless, prefira o Transaction pooler.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  {
                    id: 'transaction' as const,
                    label: 'Transaction',
                    port: '6543',
                    desc: 'Muitas conexões curtas. Recomendado para serverless/Vercel e alta carga.',
                    recommended: true,
                  },
                  {
                    id: 'session' as const,
                    label: 'Session',
                    port: '5432',
                    desc: 'Uma conexão por cliente. Use para migrations e LISTEN/NOTIFY.',
                    recommended: false,
                  },
                  {
                    id: 'direct' as const,
                    label: 'Direct',
                    port: '5432',
                    desc: 'Conexão direta sem pooler (host db.*). Esgota conexões rápido.',
                    recommended: false,
                  },
                ]).map((opt) => {
                  const active = dbMode === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => void handleDbModeChange(opt.id)}
                      disabled={dbModeSaving || dbMode === null}
                      className={`text-left p-3 rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                        active
                          ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/30'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${active ? 'text-brand-primary' : 'text-neutral-900'}`}>
                          {opt.label}
                        </span>
                        <span className="font-mono text-[11px] text-gray-500">:{opt.port}</span>
                      </div>
                      {opt.recommended && (
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-brand-secondary/15 text-brand-secondary font-medium mb-1">
                          recomendado
                        </span>
                      )}
                      <p className="text-[11px] text-gray-500 leading-snug">{opt.desc}</p>
                    </button>
                  )
                })}
              </div>
              {dbModeSaving && (
                <p className="text-[13px] text-gray-500 animate-pulse">Aplicando modo de conexão...</p>
              )}
            </div>

            {/* New DB URL form */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Nova DATABASE_URL
              </label>
              <input
                type="password"
                value={dbUrlInput}
                onChange={(e) => {
                  setDbUrlInput(e.target.value)
                  if (dbTestState !== 'idle') {
                    setDbTestState('idle')
                    setDbTestMsg('')
                  }
                }}
                placeholder="postgresql://user:senha@host:5432/dbname"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
              <p className="text-xs text-gray-400">
                A senha fica oculta. Use o formato: postgresql://usuario:senha@host:porta/banco
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => void handleDbTestConnection()}
                  disabled={!dbUrlInput.trim() || dbTestState === 'testing'}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-[13px] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {dbTestState === 'testing' ? 'Testando...' : 'Testar Conexão'}
                </button>

                <button
                  onClick={() => void handleDbSaveAndMigrate()}
                  disabled={dbTestState !== 'ok' || dbSaveState === 'saving'}
                  className="px-4 py-2 rounded-lg bg-brand-primary text-white text-[13px] font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {dbSaveState === 'saving' ? 'Salvando...' : 'Salvar e Aplicar Migrations'}
                </button>

                {dbTestState === 'ok' && (
                  <span className="text-[13px] text-green-600 font-medium flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {dbTestMsg}
                  </span>
                )}
                {dbTestState === 'error' && (
                  <span className="text-[13px] text-red-600 font-medium flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {dbTestMsg}
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-100" />

            {/* Migrations */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">Migrations Pendentes</h3>
              <p className="text-sm text-gray-500 mb-4">
                Aplique migrations pendentes para atualizar o schema do banco atual.
              </p>
              {dbMigrateState === 'idle' && (
                <button
                  onClick={async () => {
                    setDbMigrateState('running')
                    setDbLogs([])
                    type MigrateEvent =
                      | { type: 'migration'; name: string; status: 'applying' | 'done' | 'skipped' }
                      | { type: 'complete'; message: string }
                      | { type: 'error'; name: string; message: string }
                    try {
                      const res = await fetch('/api/admin/db-migrate', { method: 'POST' })
                      if (!res.body) { setDbMigrateState('error'); setDbLogs([{ text: 'Erro: resposta sem corpo.', color: 'red' }]); return }
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
                            const event: MigrateEvent = JSON.parse(line)
                            if (event.type === 'migration') {
                              if (event.status === 'applying') setDbLogs((p) => [...p, { text: `▸ Aplicando ${event.name}.sql...`, color: 'green' }])
                              else if (event.status === 'done') setDbLogs((p) => [...p, { text: `✓ ${event.name}.sql`, color: 'white' }])
                            } else if (event.type === 'complete') {
                              setDbLogs((p) => [...p, { text: `✓ ${event.message}`, color: 'white' }])
                              setDbMigrateState('done')
                            } else if (event.type === 'error') {
                              setDbLogs((p) => [...p, { text: `✗ ${event.message}`, color: 'red' }])
                              setDbMigrateState('error')
                            }
                          } catch { /* ignora parse error */ }
                        }
                      }
                    } catch (err) {
                      setDbLogs((p) => [...p, { text: `✗ ${err instanceof Error ? err.message : String(err)}`, color: 'red' }])
                      setDbMigrateState('error')
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-brand-primary text-white text-[13px] font-medium hover:bg-brand-primary/90 transition-colors"
                >
                  Atualizar banco agora
                </button>
              )}
              {dbMigrateState === 'running' && (
                <button disabled className="px-4 py-2 rounded-lg bg-gray-200 text-gray-400 text-[13px] font-medium cursor-not-allowed">
                  Atualizando...
                </button>
              )}
              {(dbMigrateState === 'running' || dbMigrateState === 'done' || dbMigrateState === 'error') && (
                <div className="mt-4 font-mono text-sm bg-neutral-900 rounded-lg p-4 h-48 overflow-y-auto space-y-0.5">
                  {dbLogs.map((line, i) => (
                    <p key={i} className={line.color === 'green' ? 'text-green-400' : line.color === 'red' ? 'text-red-400' : 'text-gray-100'}>
                      {line.text}
                    </p>
                  ))}
                  {dbMigrateState === 'running' && <p className="text-green-400 animate-pulse">_</p>}
                </div>
              )}
              {dbMigrateState === 'done' && (
                <div className="mt-3 flex gap-3">
                  <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-green-600 text-white text-[13px] font-medium hover:bg-green-700 transition-colors">
                    Recarregar página
                  </button>
                  <button onClick={() => { setDbMigrateState('idle'); setDbLogs([]) }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-[13px] font-medium hover:bg-gray-200 transition-colors">
                    Rodar novamente
                  </button>
                </div>
              )}
              {dbMigrateState === 'error' && (
                <button onClick={() => { setDbMigrateState('idle'); setDbLogs([]) }} className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-[13px] font-medium hover:bg-red-700 transition-colors">
                  Tentar novamente
                </button>
              )}
            </div>
          </section>
        )

      case 'webhooks':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Webhooks</h2>
            <p className="text-sm text-gray-500 mb-5">
              Configure endpoints externos que recebem notificações automáticas quando eventos ocorrem no sistema.
              Cada endpoint pode ouvir um ou mais eventos e opcionalmente receber os payloads assinados via HMAC-SHA256.
            </p>
            <WebhooksSection />
          </section>
        )

      case 'api':

        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-3">API</h2>
            <p className="text-sm text-gray-600 mb-4">
              Gerencie tokens de acesso e acesse a documentação completa da API pública do blog.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/admin/api"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-brand-primary text-brand-primary hover:bg-brand-primary-light transition-colors"
              >
                <span>🔑</span> Gerenciar Tokens da API
              </a>
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>📖</span> Documentação da API
              </a>
              <a
                href="/api/v1/docs"
                download="openapi.json"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>⬇️</span> Baixar OpenAPI JSON
              </a>
            </div>
          </section>
        )

      case 'adsense':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Google AdSense</h2>
            <p className="text-sm text-gray-500 mb-5">
              Habilite o Google AdSense (Auto Ads) para monetizar o blog com anúncios automáticos.
              O Google decide o posicionamento dos anúncios automaticamente. Obtenha seu Publisher ID em{' '}
              <a
                href="https://www.google.com/adsense"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary underline"
              >
                google.com/adsense
              </a>
              .
            </p>
            <div className="space-y-5">
              {/* Toggle ativar/desativar */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">Ativar anúncios</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Injeta o script do AdSense Auto Ads em todas as páginas públicas do blog.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdSense((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    adsense.enabled ? 'bg-brand-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      adsense.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Publisher ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publisher ID
                </label>
                <input
                  type="text"
                  value={adsense.publisher_id}
                  onChange={(e) => setAdSense((prev) => ({ ...prev, publisher_id: e.target.value }))}
                  placeholder="ca-pub-1234567890"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                  disabled={!adsense.enabled}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Formato: <code className="font-mono">ca-pub-XXXXXXXXXX</code>. Encontrado no dashboard do AdSense em{' '}
                  <a
                    href="https://www.google.com/adsense"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary underline"
                  >
                    google.com/adsense
                  </a>
                  .
                </p>
              </div>

              {/* Info sobre ads.txt */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>ads.txt</strong>: após salvar, o arquivo <code className="bg-blue-100 px-1 rounded font-mono">/ads.txt</code> é
                  gerado automaticamente com sua conta de publicador — obrigatório pelo Google para validação.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  setAdSenseSaving(true)
                  setToast(null)
                  try {
                    // Validar publisher_id se habilitado
                    if (adsense.enabled && adsense.publisher_id && !/^ca-pub-\d{10,}$/.test(adsense.publisher_id)) {
                      throw new Error('Publisher ID inválido (use formato ca-pub-XXXXXXXXXX)')
                    }
                    const res = await fetch('/api/admin/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ adsense }),
                    })
                    if (!res.ok) {
                      const data = await res.json()
                      throw new Error(data.error ?? 'Falha ao salvar')
                    }
                    setToast({ type: 'success', msg: 'Configurações do AdSense salvas com sucesso!' })
                    setTimeout(() => setToast(null), 3000)
                  } catch (err) {
                    setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar configurações do AdSense.' })
                    setTimeout(() => setToast(null), 3000)
                  } finally {
                    setAdSenseSaving(false)
                  }
                }}
                disabled={adsenseSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {adsenseSaving ? 'Salvando...' : 'Salvar configurações AdSense'}
              </button>
            </div>
          </section>
        )

      case 'lgpd':
        return (
          <section className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">LGPD</h2>
              <p className="text-sm text-gray-500">
                Configurações de conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
              </p>
            </div>

            {/* Grupo 1: Encarregado/Empresa */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">Encarregado (DPO) e Controlador</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do DPO</label>
                  <input
                    type="text"
                    value={lgpd.dpo_name}
                    onChange={(e) => handleLgpdChange('dpo_name', e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do DPO</label>
                  <input
                    type="email"
                    value={lgpd.dpo_email}
                    onChange={(e) => handleLgpdChange('dpo_email', e.target.value)}
                    placeholder="privacidade@suaempresa.com.br"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <p className="mt-1 text-xs text-gray-500">Exibido na Política de Privacidade e usado para verificar se o DPO está configurado.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social do Controlador</label>
                  <input
                    type="text"
                    value={lgpd.controller_name}
                    onChange={(e) => handleLgpdChange('controller_name', e.target.value)}
                    placeholder="Ex: Minha Empresa Ltda"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ do Controlador</label>
                  <input
                    type="text"
                    value={lgpd.controller_cnpj}
                    onChange={(e) => handleLgpdChange('controller_cnpj', e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
            </div>

            {/* Grupo 2: Prazos de Retenção */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">Prazos de Retenção de Dados</h3>
              <p className="text-sm text-gray-500 mb-4">
                Esses valores são lidos pela rotina diária de limpeza automática (cron). Altere com cuidado.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page views — retenção (meses)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={lgpd.retention_pageviews_months}
                    onChange={(e) => handleLgpdChange('retention_pageviews_months', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <p className="mt-1 text-xs text-gray-500">Padrão: 12 meses. Page views com mais de X meses são excluídos automaticamente.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logs de automação e IA — retenção (meses)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={lgpd.retention_logs_months}
                    onChange={(e) => handleLgpdChange('retention_logs_months', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <p className="mt-1 text-xs text-gray-500">Padrão: 6 meses.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mails cancelados — exclusão (dias após cancelamento)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={lgpd.retention_unsubscribed_days}
                    onChange={(e) => handleLgpdChange('retention_unsubscribed_days', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <p className="mt-1 text-xs text-gray-500">Padrão: 30 dias. Inscrições com status cancelado são excluídas após X dias.</p>
                </div>
              </div>
            </div>

            {/* Grupo 3: Consentimento */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">Consentimento da Newsletter</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto do checkbox</label>
                  <textarea
                    value={lgpd.consent_text}
                    onChange={(e) => handleLgpdChange('consent_text', e.target.value)}
                    rows={2}
                    placeholder="Li e aceito a Política de Privacidade"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">Texto exibido no checkbox de consentimento ao se inscrever na newsletter.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Versão do consentimento</label>
                  <input
                    type="text"
                    value={lgpd.consent_version}
                    onChange={(e) => handleLgpdChange('consent_version', e.target.value)}
                    placeholder="v1-2026-06"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Identificador da versão do consentimento gravado em cada inscrição.
                    Altere ao atualizar a Política de Privacidade (ex: v2-2026-12).
                  </p>
                </div>
              </div>
            </div>

            {/* Botão salvar */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleLgpdSave()}
                disabled={lgpdSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {lgpdSaving ? 'Salvando...' : 'Salvar configurações LGPD'}
              </button>
            </div>

            {/* Grupo 4: Painel de status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">Painel de Conformidade</h3>
              {lgpdStatusLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : lgpdStatus ? (
                <ul className="space-y-3">
                  {lgpdStatus.map((check) => (
                    <li key={check.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                      {check.ok ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-green-600">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-red-500">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${check.ok ? 'text-neutral-900' : 'text-red-700'}`}>{check.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{check.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">Nenhum dado de conformidade disponível.</p>
              )}
            </div>
          </section>
        )

      case 'facebook-pixel':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Facebook Pixel (Meta)</h2>
            <p className="text-sm text-gray-500 mb-5">
              Configure o rastreamento via Facebook Pixel para medir conversões e criar audiências personalizadas no
              Gerenciador de Anúncios da Meta. O Pixel <strong>só dispara após o visitante aceitar</strong> o banner de
              consentimento de cookies (LGPD).
            </p>

            <div className="space-y-5">
              {/* Toggle ativar */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">Ativar Facebook Pixel</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Injeta o script do Pixel em todas as páginas públicas, condicionado ao consentimento do visitante.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFacebookPixel((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    facebookPixel.enabled ? 'bg-brand-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      facebookPixel.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Pixel IDs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pixel IDs
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Adicione um ou mais IDs. Todos receberão os mesmos eventos simultaneamente.
                  Encontre seu ID em <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">Events Manager</a>.
                </p>

                {/* Lista de IDs existentes */}
                {facebookPixel.pixel_ids.length > 0 && (
                  <ul className="space-y-2 mb-3">
                    {facebookPixel.pixel_ids.map((pid) => (
                      <li key={pid} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="font-mono text-sm text-neutral-900">{pid}</span>
                        <button
                          type="button"
                          onClick={() => setFacebookPixel((prev) => ({ ...prev, pixel_ids: prev.pixel_ids.filter((id) => id !== pid) }))}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Remover pixel ${pid}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Adicionar novo ID */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPixelId}
                    onChange={(e) => setNewPixelId(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 1234567890123456"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const id = newPixelId.trim()
                        if (id && !facebookPixel.pixel_ids.includes(id)) {
                          setFacebookPixel((prev) => ({ ...prev, pixel_ids: [...prev.pixel_ids, id] }))
                          setNewPixelId('')
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const id = newPixelId.trim()
                      if (id && !facebookPixel.pixel_ids.includes(id)) {
                        setFacebookPixel((prev) => ({ ...prev, pixel_ids: [...prev.pixel_ids, id] }))
                        setNewPixelId('')
                      }
                    }}
                    disabled={!newPixelId.trim()}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Digite apenas dígitos e pressione Enter ou clique em Adicionar.</p>
              </div>

              {/* Toggles de eventos */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Eventos rastreados</h3>
                <div className="space-y-3">
                  {([
                    { key: 'track_pageview', label: 'PageView', desc: 'Dispara a cada troca de página (automático).' },
                    { key: 'track_viewcontent', label: 'ViewContent', desc: 'Dispara ao abrir um artigo com título e categoria.' },
                    { key: 'track_lead', label: 'Lead', desc: 'Dispara ao confirmar inscrição na newsletter.' },
                  ] as const).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFacebookPixel((prev) => ({ ...prev, [key]: !prev[key] }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          facebookPixel[key] ? 'bg-brand-primary' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            facebookPixel[key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota LGPD */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>LGPD:</strong> o Pixel só é inicializado e dispara eventos após o visitante clicar em{' '}
                  <em>Aceitar</em> no banner de cookies. Visitantes que recusarem ou ainda não responderam{' '}
                  <strong>não</strong> são rastreados.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  setFacebookPixelSaving(true)
                  setToast(null)
                  try {
                    const res = await fetch('/api/admin/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ facebook_pixel: facebookPixel }),
                    })
                    if (!res.ok) {
                      const data = await res.json()
                      throw new Error(data.error ?? 'Falha ao salvar')
                    }
                    setToast({ type: 'success', msg: 'Configurações do Facebook Pixel salvas com sucesso!' })
                    setTimeout(() => setToast(null), 3000)
                  } catch (err) {
                    setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar configurações do Facebook Pixel.' })
                    setTimeout(() => setToast(null), 3000)
                  } finally {
                    setFacebookPixelSaving(false)
                  }
                }}
                disabled={facebookPixelSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {facebookPixelSaving ? 'Salvando...' : 'Salvar configurações do Pixel'}
              </button>
            </div>
          </section>
        )
    }
  }

  usePageTitle('Configurações')

  return (
    <div>
      {toast && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex gap-6">
        <nav className="w-56 shrink-0">
          <ul className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {SIDEBAR_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-brand-primary text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>

      <AdminFormActions>
        <Button onClick={handleSave} loading={saving}>
          Salvar alterações
        </Button>
      </AdminFormActions>
    </div>
  )
}
