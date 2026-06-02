'use client'
import { useState, useEffect, useCallback } from 'react'

type CrawlerType = 'github' | 'docs' | 'custom'
type PublishStatus = 'draft' | 'published'

interface SourceCrawler {
  id: number
  name: string
  type: CrawlerType
  url: string
  prompt: string
  interval_hours: number
  enabled: boolean
  publish_status: PublishStatus
  last_run_at: string | null
  next_run_at: string | null
  last_error: string | null
  created_at: string
  items_total: number
  items_done: number
}

interface CrawlerItem {
  id: number
  crawler_id: number
  item_key: string
  item_title: string | null
  post_id: number | null
  status: string
  error: string | null
  processed_at: string
}

interface Toast { type: 'success' | 'error'; msg: string }

const TYPE_LABELS: Record<CrawlerType, string> = {
  github: 'GitHub',
  docs: 'Documentação',
  custom: 'URL Customizada',
}

const TYPE_ICONS: Record<CrawlerType, string> = {
  github: '⚙️',
  docs: '📖',
  custom: '🔗',
}

const INTERVAL_OPTIONS = [
  { value: 1, label: '1 hora' },
  { value: 6, label: '6 horas' },
  { value: 12, label: '12 horas' },
  { value: 24, label: '24 horas' },
  { value: 48, label: '48 horas' },
  { value: 168, label: '1 semana' },
]

const EMPTY_FORM = {
  name: '',
  type: 'github' as CrawlerType,
  url: '',
  prompt: '',
  interval_hours: 24,
  enabled: true,
  publish_status: 'published' as PublishStatus,
}

const URL_HINTS: Record<CrawlerType, string> = {
  github: 'Termo de busca no GitHub (ex: "AI tools machine learning")',
  docs: 'URL base da documentação (ex: https://docs.anthropic.com)',
  custom: 'URL específica para raspar (ex: https://example.com/page)',
}

function formatDate(d: string | null) {
  if (!d) return 'nunca'
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function FontesClient() {
  const [crawlers, setCrawlers] = useState<SourceCrawler[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<number | null>(null)
  const [selectedCrawler, setSelectedCrawler] = useState<SourceCrawler | null>(null)
  const [items, setItems] = useState<CrawlerItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchCrawlers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/source-crawlers')
      const data = await res.json() as { crawlers: SourceCrawler[] }
      setCrawlers(data.crawlers ?? [])
    } catch {
      showToast('error', 'Erro ao carregar fontes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCrawlers() }, [fetchCrawlers])

  const fetchItems = async (crawlerId: number) => {
    setLoadingItems(true)
    try {
      const res = await fetch(`/api/admin/source-crawlers/${crawlerId}/items`)
      const data = await res.json() as { items: CrawlerItem[] }
      setItems(data.items ?? [])
    } finally {
      setLoadingItems(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const openEdit = (c: SourceCrawler) => {
    setEditingId(c.id)
    setForm({ name: c.name, type: c.type, url: c.url, prompt: c.prompt, interval_hours: c.interval_hours, enabled: c.enabled, publish_status: c.publish_status })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) { showToast('error', 'Nome e URL são obrigatórios'); return }
    setSaving(true)
    try {
      if (editingId) {
        await fetch(`/api/admin/source-crawlers/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        showToast('success', 'Fonte atualizada')
      } else {
        await fetch('/api/admin/source-crawlers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        showToast('success', 'Fonte criada')
      }
      setShowModal(false)
      await fetchCrawlers()
    } catch {
      showToast('error', 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover esta fonte?')) return
    await fetch(`/api/admin/source-crawlers/${id}`, { method: 'DELETE' })
    if (selectedCrawler?.id === id) setSelectedCrawler(null)
    await fetchCrawlers()
    showToast('success', 'Fonte removida')
  }

  const handleToggle = async (c: SourceCrawler) => {
    await fetch(`/api/admin/source-crawlers/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !c.enabled }) })
    await fetchCrawlers()
  }

  const handleRun = async (id: number) => {
    setRunningId(id)
    try {
      const res = await fetch(`/api/admin/source-crawlers/${id}`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; error?: string }
      if (data.ok) {
        showToast('success', 'Artigo gerado com sucesso!')
        await fetchCrawlers()
        if (selectedCrawler?.id === id) await fetchItems(id)
      } else {
        showToast('error', data.error ?? 'Erro ao executar')
      }
    } catch {
      showToast('error', 'Erro ao executar fonte')
    } finally {
      setRunningId(null)
    }
  }

  const selectCrawler = (c: SourceCrawler) => {
    setSelectedCrawler(c)
    fetchItems(c.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Fontes de Conteúdo</h2>
          <p className="text-sm text-gray-500 mt-1">
            Agentes que buscam conteúdo externo e geram artigos automaticamente via pipeline de IA.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Nova Fonte
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Como funciona:</strong> Cada fonte busca conteúdo em um serviço externo (GitHub, documentações ou URLs), usa IA para escolher o item mais relevante ainda não processado e aciona o pipeline padrão para gerar e publicar um artigo. O Supabase pg_cron executa automaticamente no intervalo configurado.
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando fontes...</div>
      ) : crawlers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhuma fonte configurada</h3>
          <p className="text-sm text-gray-500 mb-6">Adicione uma fonte para que o sistema busque conteúdo automaticamente e gere artigos.</p>
          <button onClick={openCreate} className="px-6 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Adicionar primeira fonte
          </button>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Crawler list */}
          <div className="flex-1 min-w-0 space-y-3">
            {crawlers.map((c) => (
              <div
                key={c.id}
                onClick={() => selectCrawler(c)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors hover:border-brand-primary ${selectedCrawler?.id === c.id ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl">{TYPE_ICONS[c.type]}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{c.name}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{TYPE_LABELS[c.type]}</span>
                        {c.publish_status === 'published'
                          ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Publica direto</span>
                          : <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Salva como rascunho</span>
                        }
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate">{c.url}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                        <span>A cada {INTERVAL_OPTIONS.find((o) => o.value === c.interval_hours)?.label ?? `${c.interval_hours}h`}</span>
                        <span>•</span>
                        <span>Última execução: {formatDate(c.last_run_at)}</span>
                        <span>•</span>
                        <span>{c.items_done} artigo(s) gerado(s)</span>
                      </div>
                      {c.last_error && (
                        <p className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-0.5 inline-block">
                          Erro: {c.last_error.slice(0, 120)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Toggle */}
                    <button
                      title={c.enabled ? 'Desativar' : 'Ativar'}
                      onClick={() => handleToggle(c)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.enabled ? 'bg-brand-primary' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${c.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>

                    {/* Run now */}
                    <button
                      title="Executar agora"
                      onClick={() => handleRun(c.id)}
                      disabled={runningId === c.id}
                      className="p-1.5 text-gray-500 hover:text-brand-primary hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {runningId === c.id ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <polygon points="5,3 19,12 5,21" fill="currentColor" />
                        </svg>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      title="Editar"
                      onClick={() => openEdit(c)}
                      className="p-1.5 text-gray-500 hover:text-brand-primary hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      title="Remover"
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* History panel */}
          {selectedCrawler && (
            <div className="w-80 shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">Histórico — {selectedCrawler.name}</h3>
                {loadingItems ? (
                  <p className="text-xs text-gray-500 text-center py-4">Carregando...</p>
                ) : items.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">Nenhuma execução ainda.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="text-xs p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-medium ${item.status === 'done' ? 'text-green-700' : 'text-red-600'}`}>
                            {item.status === 'done' ? '✅' : '❌'} {item.item_title ?? item.item_key}
                          </span>
                          <span className="text-gray-400 shrink-0">{formatDate(item.processed_at)}</span>
                        </div>
                        {item.post_id && (
                          <a href={`/admin/artigos/${item.post_id}`} className="mt-1 block text-brand-primary underline text-xs" onClick={(e) => e.stopPropagation()}>
                            Ver artigo #{item.post_id}
                          </a>
                        )}
                        {item.error && <p className="mt-1 text-red-500 truncate">{item.error}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="font-bold text-lg text-gray-900">{editingId ? 'Editar Fonte' : 'Nova Fonte'}</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: GitHub AI Repos"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CrawlerType }))}
                >
                  {(Object.keys(TYPE_LABELS) as CrawlerType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_ICONS[t]} {TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {form.type === 'github' ? 'Termo de busca' : 'URL'}
                </label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder={URL_HINTS[form.type]}
                />
                <p className="text-xs text-gray-400 mt-1">{URL_HINTS[form.type]}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Prompt de direcionamento</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  value={form.prompt}
                  onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                  placeholder="Ex: Prefira repositórios sobre IA generativa com mais de 1000 stars, relevantes para desenvolvedores brasileiros."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Intervalo</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    value={form.interval_hours}
                    onChange={(e) => setForm((f) => ({ ...f, interval_hours: parseFloat(e.target.value) }))}
                  >
                    {INTERVAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Publicar como</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    value={form.publish_status}
                    onChange={(e) => setForm((f) => ({ ...f, publish_status: e.target.value as PublishStatus }))}
                  >
                    <option value="published">Publicado</option>
                    <option value="draft">Rascunho</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-brand-primary hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
