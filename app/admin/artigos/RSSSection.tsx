'use client'
import { useState, useEffect } from 'react'

type FeedType = 'blog' | 'youtube' | 'podcast' | 'news'
type PublishStatus = 'draft' | 'published'

interface RssFeed {
  id: number
  name: string
  url: string
  type: FeedType
  enabled: boolean
  publish_status: PublishStatus
  check_interval_minutes: number
  last_checked_at: string | null
  last_error: string | null
  created_at: string
  items_total: number
  items_done: number
}

interface RssItem {
  id: number
  feed_id: number
  item_guid: string
  item_url: string | null
  item_title: string | null
  post_id: number | null
  status: string
  error: string | null
  processed_at: string
}

interface Toast { type: 'success' | 'error'; msg: string }

const TYPE_LABELS: Record<FeedType, string> = {
  blog: 'Blog',
  youtube: 'YouTube',
  podcast: 'Podcast',
  news: 'Notícias',
}

const TYPE_ICONS: Record<FeedType, string> = {
  blog: '📝',
  youtube: '▶️',
  podcast: '🎙️',
  news: '📰',
}

const INTERVAL_OPTIONS = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 360, label: '6 horas' },
  { value: 720, label: '12 horas' },
  { value: 1440, label: '24 horas' },
]

const EMPTY_FORM = {
  name: '',
  url: '',
  type: 'blog' as FeedType,
  publish_status: 'draft' as PublishStatus,
  check_interval_minutes: 60,
  enabled: true,
}

export default function RSSSection() {
  const [feeds, setFeeds] = useState<RssFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [checkingFeed, setCheckingFeed] = useState<number | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingFeed, setEditingFeed] = useState<RssFeed | null>(null)
  const [selectedFeed, setSelectedFeed] = useState<RssFeed | null>(null)
  const [feedItems, setFeedItems] = useState<RssItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function showToast(type: Toast['type'], msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function loadFeeds() {
    try {
      const res = await fetch('/api/admin/rss')
      const data = await res.json() as { feeds: RssFeed[] }
      setFeeds(data.feeds ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFeeds() }, [])

  async function handleCheckAll() {
    setChecking(true)
    try {
      const res = await fetch('/api/admin/rss/check', { method: 'POST' })
      const data = await res.json() as { ok: boolean; articles_generated: number; new_items_found: number; error?: string }
      if (data.ok) {
        showToast('success', `${data.new_items_found} novo(s) item(ns) encontrado(s), ${data.articles_generated} artigo(s) gerado(s)`)
        loadFeeds()
      } else {
        showToast('error', data.error ?? 'Erro ao verificar feeds')
      }
    } catch {
      showToast('error', 'Erro ao verificar feeds')
    } finally {
      setChecking(false)
    }
  }

  async function handleCheckFeed(feedId: number) {
    setCheckingFeed(feedId)
    try {
      const res = await fetch(`/api/admin/rss/${feedId}/check`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; newItems: number; processedItem?: { postId?: number }; error?: string; feedName: string }
      if (data.ok) {
        const generated = data.processedItem ? 1 : 0
        showToast('success', `${data.newItems} novo(s) item(ns) no feed "${data.feedName}", ${generated} artigo(s) gerado(s)`)
        loadFeeds()
        if (selectedFeed?.id === feedId) loadFeedItems(feedId)
      } else {
        showToast('error', data.error ?? 'Erro ao verificar feed')
      }
    } catch {
      showToast('error', 'Erro ao verificar feed')
    } finally {
      setCheckingFeed(null)
    }
  }

  async function handleToggleEnabled(feed: RssFeed) {
    await fetch(`/api/admin/rss/${feed.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !feed.enabled }),
    })
    setFeeds((prev) => prev.map((f) => f.id === feed.id ? { ...f, enabled: !f.enabled } : f))
  }

  async function handleDelete(feed: RssFeed) {
    if (!confirm(`Excluir feed "${feed.name}"? O histórico de itens processados também será removido.`)) return
    await fetch(`/api/admin/rss/${feed.id}`, { method: 'DELETE' })
    setFeeds((prev) => prev.filter((f) => f.id !== feed.id))
    if (selectedFeed?.id === feed.id) setSelectedFeed(null)
    showToast('success', 'Feed removido')
  }

  function openAddModal() {
    setEditingFeed(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEditModal(feed: RssFeed) {
    setEditingFeed(feed)
    setForm({
      name: feed.name,
      url: feed.url,
      type: feed.type,
      publish_status: feed.publish_status,
      check_interval_minutes: feed.check_interval_minutes,
      enabled: feed.enabled,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.url.trim()) {
      showToast('error', 'Nome e URL são obrigatórios')
      return
    }
    setSaving(true)
    try {
      if (editingFeed) {
        const res = await fetch(`/api/admin/rss/${editingFeed.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json() as { feed?: RssFeed; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')
        setFeeds((prev) => prev.map((f) => f.id === editingFeed.id ? { ...f, ...data.feed } : f))
        showToast('success', 'Feed atualizado')
      } else {
        const res = await fetch('/api/admin/rss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json() as { feed?: RssFeed; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Erro ao criar')
        showToast('success', 'Feed adicionado com sucesso')
        loadFeeds()
      }
      setShowModal(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function loadFeedItems(feedId: number) {
    setLoadingItems(true)
    try {
      const res = await fetch(`/api/admin/rss/${feedId}`)
      const data = await res.json() as { feed: RssFeed; items: RssItem[] }
      setFeedItems(data.items ?? [])
    } finally {
      setLoadingItems(false)
    }
  }

  function handleSelectFeed(feed: RssFeed) {
    setSelectedFeed(feed)
    loadFeedItems(feed.id)
  }

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      queued: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      done: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
    }
    const labels: Record<string, string> = {
      queued: 'Na fila',
      processing: 'Processando',
      done: 'Concluído',
      error: 'Erro',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
        {labels[status] ?? status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Automação via RSS</h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitore feeds RSS/Atom e gere artigos automaticamente com o pipeline de IA quando novos itens aparecerem.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCheckAll}
            disabled={checking || feeds.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {checking ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : '🔄'}
            Verificar todos
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Adicionar feed
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Como funciona:</strong> O sistema verifica automaticamente cada feed no intervalo configurado. Quando um item novo é encontrado, o pipeline de IA gera um artigo original inspirado no conteúdo do feed. O Vercel Cron executa as verificações a cada 30 minutos.
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando feeds...</div>
      ) : feeds.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">📡</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum feed cadastrado</h3>
          <p className="text-sm text-gray-500 mb-6">Adicione feeds RSS de blogs, YouTube ou outros sites para gerar artigos automaticamente.</p>
          <button onClick={openAddModal} className="px-6 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Adicionar primeiro feed
          </button>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Feed list */}
          <div className="flex-1 min-w-0 space-y-3">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                onClick={() => handleSelectFeed(feed)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors hover:border-brand-primary ${selectedFeed?.id === feed.id ? 'border-brand-primary ring-1 ring-brand-primary' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl">{TYPE_ICONS[feed.type]}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{feed.name}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{TYPE_LABELS[feed.type]}</span>
                        {feed.publish_status === 'published'
                          ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Publica direto</span>
                          : <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Salva como rascunho</span>
                        }
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate">{feed.url}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                        <span>Verifica a cada {INTERVAL_OPTIONS.find((o) => o.value === feed.check_interval_minutes)?.label ?? `${feed.check_interval_minutes}min`}</span>
                        <span>•</span>
                        <span>Última verificação: {formatDate(feed.last_checked_at)}</span>
                        <span>•</span>
                        <span>{feed.items_done} artigo(s) gerado(s)</span>
                      </div>
                      {feed.last_error && (
                        <p className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-0.5 inline-block">
                          Erro: {feed.last_error.slice(0, 120)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Enabled toggle */}
                    <button
                      title={feed.enabled ? 'Desativar' : 'Ativar'}
                      onClick={() => handleToggleEnabled(feed)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${feed.enabled ? 'bg-brand-primary' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${feed.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>

                    {/* Check feed */}
                    <button
                      title="Verificar agora"
                      onClick={() => handleCheckFeed(feed.id)}
                      disabled={checkingFeed === feed.id}
                      className="p-1.5 text-gray-500 hover:text-brand-primary hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {checkingFeed === feed.id ? (
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      title="Editar"
                      onClick={() => openEditModal(feed)}
                      className="p-1.5 text-gray-500 hover:text-brand-primary hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      title="Excluir"
                      onClick={() => handleDelete(feed)}
                      className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

          {/* Item history panel */}
          {selectedFeed && (
            <div className="w-80 shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{selectedFeed.name}</p>
                    <p className="text-xs text-gray-500">Histórico de itens</p>
                  </div>
                  <button onClick={() => setSelectedFeed(null)} className="text-gray-400 hover:text-gray-600 p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
                  {loadingItems ? (
                    <div className="p-6 text-center text-sm text-gray-500">Carregando...</div>
                  ) : feedItems.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">Nenhum item processado ainda.</div>
                  ) : feedItems.map((item) => (
                    <div key={item.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        {statusBadge(item.status)}
                        <span className="text-xs text-gray-400">{formatDate(item.processed_at)}</span>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">{item.item_title ?? item.item_guid}</p>
                      {item.item_url && (
                        <a href={item.item_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">
                          {item.item_url}
                        </a>
                      )}
                      {item.post_id && (
                        <a href={`/admin/artigos`} className="text-xs text-green-600 hover:underline">
                          → Artigo #{item.post_id}
                        </a>
                      )}
                      {item.error && (
                        <p className="text-xs text-red-600 bg-red-50 rounded px-1.5 py-0.5">{item.error.slice(0, 100)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editingFeed ? 'Editar feed RSS' : 'Adicionar feed RSS'}</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Blog do Neil Patel"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do feed RSS/Atom *</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://blog.exemplo.com/feed"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <p className="text-xs text-gray-400 mt-1">YouTube: use https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID</p>
              </div>

              {/* Type + Publish status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FeedType }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {(Object.entries(TYPE_LABELS) as [FeedType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{TYPE_ICONS[v]} {l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publicação</label>
                  <select
                    value={form.publish_status}
                    onChange={(e) => setForm((f) => ({ ...f, publish_status: e.target.value as PublishStatus }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>
              </div>

              {/* Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verificar a cada</label>
                <select
                  value={form.check_interval_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, check_interval_minutes: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  {INTERVAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.enabled ? 'bg-brand-primary' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700">Feed ativo</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-brand-primary hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : editingFeed ? 'Salvar alterações' : 'Adicionar feed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
