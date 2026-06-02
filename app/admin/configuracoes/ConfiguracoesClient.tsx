'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { ModelCombobox } from '@/components/ui/ModelCombobox'
import type { CompanyInfo } from '@/lib/settings'

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

interface Props {
  initial: CompanyInfo
  initialAI: AISettings
  initialTelegram: TelegramSettings
  initialFirecrawl: FirecrawlSettings
  initialPexels: PexelsSettings
}

type CompanyKey = keyof CompanyInfo
type SectionId = 'blog' | 'empresa' | 'redes' | 'ia' | 'firecrawl' | 'pexels' | 'api' | 'telegram'

interface RemoteModel {
  id: string
  name: string
}

const FEATURE_LABELS: Record<string, string> = {
  content_generation: 'Geração de Conteúdo',
  title_suggestion: 'Sugestão de Títulos',
  excerpt_generation: 'Geração de Resumo',
  seo_optimization: 'Otimização SEO',
  image_description: 'Descrição de Imagens',
  image_generation: 'Geração de Imagens',
  summarization: 'Sumarização',
  briefing_generation: 'Geração de Briefing',
  prompt_generation: 'Geração de Prompts',
  theme_suggestion: 'Sugestão de Temas',
  category_matching: 'Categorização de Artigos',
}

const SIDEBAR_ITEMS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'empresa', label: 'Dados da Empresa', icon: '🏢' },
  { id: 'redes', label: 'Redes Sociais', icon: '🌐' },
  { id: 'ia', label: 'IA (OpenRouter)', icon: '🤖' },
  { id: 'firecrawl', label: 'Firecrawl', icon: '🔥' },
  { id: 'pexels', label: 'Pexels', icon: '📷' },
  { id: 'api', label: 'API', icon: '🔑' },
  { id: 'telegram', label: 'Telegram Bot', icon: '✈️' },
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

export function ConfiguracoesClient({ initial, initialAI, initialTelegram, initialFirecrawl, initialPexels }: Props) {
  const [company, setCompany] = useState<CompanyInfo>(initial)
  const [ai, setAI] = useState<AISettings>(initialAI)
  const [telegram, setTelegram] = useState<TelegramSettings>(initialTelegram)
  const [firecrawl, setFirecrawl] = useState<FirecrawlSettings>(initialFirecrawl)
  const [pexels, setPexels] = useState<PexelsSettings>(initialPexels)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [activeSection, setActiveSection] = useState<SectionId>('blog')
  const [availableModels, setAvailableModels] = useState<RemoteModel[]>([])
  const [availableImageModels, setAvailableImageModels] = useState<RemoteModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [webhookLoading, setWebhookLoading] = useState(false)

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

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, ai, telegram, firecrawl, pexels }),
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
                <div className="space-y-4">
                  {Object.entries(ai.models).map(([feature, model]) => (
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
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Configurações</h1>
        <Button onClick={handleSave} loading={saving}>
          Salvar alterações
        </Button>
      </div>

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

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          Salvar alterações
        </Button>
      </div>
    </div>
  )
}
