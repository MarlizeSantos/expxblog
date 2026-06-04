'use client'

import {
  IconListaArtigos,
  IconTemas,
  IconBriefing,
  IconAutomacao,
  IconRSS,
  IconFontes,
  IconAgentes,
  IconCategorias,
  IconTags,
  IconConfiguracaoArtigos,
} from '@/components/admin/icons/ExpxIcons'

import { useState, useEffect, useCallback, Suspense, KeyboardEvent, type ReactNode } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import NewArticleModal from './NewArticleModal'
import AgentsSection from './AgentsSection'
import RSSSection from './RSSSection'
import FontesClient from '../fontes/FontesClient'
import LogsSection from './LogsSection'
import type { Post, Category, Tag } from '@/lib/admin-types'
import type { ArticleGenerationConfig, ArticleVoiceTone, ArticleLanguage } from '@/lib/article-config-types'
import { ARTICLE_CONFIG_DEFAULTS } from '@/lib/article-config-types'
import { AdminFormActions } from '@/components/admin/AdminFormActions'

type SectionId = 'lista' | 'temas' | 'briefing' | 'automacao' | 'rss' | 'fontes' | 'agentes' | 'categorias' | 'tags' | 'configuracao'

function formatDateTime(d: Date | string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(d))
}

const SIDEBAR_ITEMS: { id: SectionId; label: string; icon: ReactNode }[] = [
  { id: 'lista', label: 'Lista de Artigos', icon: <IconListaArtigos /> },
  { id: 'temas', label: 'Temas', icon: <IconTemas /> },
  { id: 'briefing', label: 'Briefing', icon: <IconBriefing /> },
  { id: 'automacao', label: 'Automação', icon: <IconAutomacao /> },
  { id: 'rss', label: 'RSS', icon: <IconRSS /> },
  { id: 'fontes', label: 'Fontes de Conteúdo', icon: <IconFontes /> },
  { id: 'agentes', label: 'Agentes de IA', icon: <IconAgentes /> },
  { id: 'categorias', label: 'Categorias', icon: <IconCategorias /> },
  { id: 'tags', label: 'Tags', icon: <IconTags /> },
  { id: 'configuracao', label: 'Configurações', icon: <IconConfiguracaoArtigos /> },
]

export default function ArtigosClient() {
  usePageTitle('Artigos')
  const [activeSection, setActiveSection] = useState<SectionId>('lista')
  const [logsModalOpen, setLogsModalOpen] = useState(false)

  function renderContent() {
    switch (activeSection) {
      case 'lista':
        return (
          <Suspense fallback={null}>
            <ListaArtigos />
          </Suspense>
        )
      case 'temas':
        return <TemasSection />
      case 'briefing':
        return <BriefingSection />
      case 'automacao':
        return <AutomacaoSection />
      case 'rss':
        return <RSSSection />
      case 'fontes':
        return <FontesClient />
      case 'agentes':
        return <AgentsSection />
      case 'categorias':
        return <CategoriasSection />
      case 'tags':
        return <TagsSection />
      case 'configuracao':
        return <ConfiguracaoArtigosSection />
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={() => setLogsModalOpen(true)}
          title="Logs de Geração"
          className="p-2 rounded-lg text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5 transition-colors"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </button>
      </div>

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

      {logsModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setLogsModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-neutral-900">Logs de Geração</h2>
              <button
                onClick={() => setLogsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <LogsSection />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ListaArtigos() {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const searchParams = useSearchParams()

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // Abre o modal de geração com IA quando chega via atalho do dashboard (?new=1)
  useEffect(() => {
    if (searchParams.get('new') === '1') setShowNewModal(true)
  }, [searchParams])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const q = status !== 'all' ? `&status=${status}` : ''
      const res = await fetch(`/api/admin/posts?limit=20${q}`)
      const data = await res.json()
      setPosts(data.posts ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function confirmDelete(post: Post) {
    setDeleting(post.id)
    setPendingDelete(null)
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        showToast('error', data.error ?? 'Erro ao excluir artigo')
      } else {
        showToast('success', 'Artigo excluído com sucesso!')
        await fetchPosts()
      }
    } catch {
      showToast('error', 'Erro ao excluir artigo')
    } finally {
      setDeleting(null)
    }
  }


  return (
    <>
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-neutral-900 mb-2">Excluir artigo</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir o artigo <strong>&ldquo;{pendingDelete.title}&rdquo;</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete(pendingDelete)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{total} artigos</span>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors"
        >
          + Novo Artigo
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'published', 'draft'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              status === s ? 'bg-brand-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {{ all: 'Todos', published: 'Publicados', draft: 'Rascunhos' }[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-neutral-900 max-w-xs truncate">{post.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant={post.status as 'draft' | 'published'}>
                      {{ draft: 'Rascunho', published: 'Publicado' }[post.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(post.published_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end items-center">
                      <Link href={`/admin/artigos/${post.id}/editar`} title="Editar" className="text-brand-primary hover:text-brand-primary/70">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </Link>
                      <button
                        onClick={() => setPendingDelete(post)}
                        disabled={deleting === post.id}
                        title="Excluir"
                        className="text-red-600 hover:text-red-400 disabled:opacity-50"
                      >
                        {deleting === post.id
                          ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">Nenhum artigo encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <NewArticleModal open={showNewModal} onClose={() => setShowNewModal(false)} />
    </>
  )
}

function BriefingSection() {
  const [url, setUrl] = useState('')
  const [briefing, setBriefing] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/briefing')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { url?: string; briefing?: string }) => {
        if (data.url) setUrl(data.url)
        if (data.briefing) setBriefing(data.briefing)
      })
      .catch(() => {})
  }, [])

  async function handleGenerate() {
    if (!url.trim()) return
    setLoading(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar briefing')
      setBriefing(data.briefing)
      setToast({ type: 'success', msg: 'Briefing gerado com sucesso!' })
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao gerar briefing' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/briefing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, briefing }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setToast({ type: 'success', msg: 'Briefing salvo com sucesso!' })
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar briefing' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-1">Briefing</h2>
      <p className="text-sm text-gray-500 mb-5">
        Informe o site da empresa para gerar automaticamente um briefing com análise de público-alvo, pilares de conteúdo e sugestões de artigos. Você também pode editar livremente o texto abaixo.
      </p>

      {toast && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Site da Empresa</label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.empresa.com.br"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !url.trim()}
            className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Gerando...
              </span>
            ) : (
              'Gerar Briefing'
            )}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo do Briefing</label>
        <textarea
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
          rows={20}
          placeholder="O briefing será gerado aqui após informar o site. Você também pode escrever ou colar manualmente."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y leading-relaxed"
        />
      </div>

      <AdminFormActions>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Briefing'}
        </button>
      </AdminFormActions>
    </section>
  )
}

type ArticleTheme = {
  id: number
  title: string
  description: string | null
  source: string
  status: string
  created_at: string
}

function TemasSection() {
  const [themes, setThemes] = useState<ArticleTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTheme, setEditTheme] = useState<ArticleTheme | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [pendingDeleteTheme, setPendingDeleteTheme] = useState<ArticleTheme | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function fetchThemes() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/themes')
      const data = await res.json()
      setThemes(data.themes ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchThemes() }, [])

  async function handleGenerate() {
    setGenerating(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar temas')
      setToast({ type: 'success', msg: `${data.total} temas sugeridos pela IA com sucesso!` })
      await fetchThemes()
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao gerar temas' })
    } finally {
      setGenerating(false)
    }
  }

  async function handleAddManual() {
    if (!newTitle.trim()) return
    try {
      const res = await fetch('/api/admin/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDescription.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao criar tema')
      }
      setNewTitle('')
      setNewDescription('')
      setShowAddModal(false)
      setToast({ type: 'success', msg: 'Tema adicionado com sucesso!' })
      await fetchThemes()
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao criar tema' })
    }
  }

  async function handleEdit() {
    if (!editTheme || !newTitle.trim()) return
    try {
      const res = await fetch('/api/admin/themes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTheme.id, title: newTitle.trim(), description: newDescription.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao editar tema')
      }
      setShowEditModal(false)
      setEditTheme(null)
      setNewTitle('')
      setNewDescription('')
      setToast({ type: 'success', msg: 'Tema atualizado com sucesso!' })
      await fetchThemes()
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao editar tema' })
    }
  }

  async function confirmDeleteTheme(theme: ArticleTheme) {
    setPendingDeleteTheme(null)
    setDeleting(theme.id)
    try {
      const res = await fetch(`/api/admin/themes?id=${theme.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao excluir')
      }
      setToast({ type: 'success', msg: 'Tema excluído com sucesso!' })
      await fetchThemes()
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao excluir tema' })
    } finally {
      setDeleting(null)
    }
  }

  function openEditModal(theme: ArticleTheme) {
    setEditTheme(theme)
    setNewTitle(theme.title)
    setNewDescription(theme.description ?? '')
    setShowEditModal(true)
  }

  function formatDate(d: string) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Temas para Artigos</h2>
          <p className="text-sm text-gray-500 mt-1">
            Pesquise temas quentes e relevantes com IA ou cadastre manualmente. Esses temas serão usados na criação de artigos.
          </p>
        </div>
      </div>

      {toast && (
        <div
          className={`mt-4 mb-4 px-4 py-3 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex gap-3 mt-5 mb-5">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Pesquisando temas...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
              </svg>
              Pesquisar Temas com IA
            </>
          )}
        </button>
        <button
          onClick={() => { setNewTitle(''); setNewDescription(''); setShowAddModal(true) }}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar Manualmente
        </button>
      </div>

      <div className="text-xs text-gray-400 mb-3">{themes.length} tema{themes.length !== 1 ? 's' : ''} cadastrado{themes.length !== 1 ? 's' : ''}</div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : themes.length === 0 ? (
        <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
          Nenhum tema cadastrado. Use a IA para pesquisar temas ou adicione manualmente.
        </div>
      ) : (
        <div className="space-y-3">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-neutral-900 truncate">{theme.title}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                        theme.source === 'ai'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {theme.source === 'ai' ? 'IA' : 'Manual'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                        theme.status === 'used'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}
                    >
                      {theme.status === 'used' ? 'Usado' : 'Pendente'}
                    </span>
                  </div>
                  {theme.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">{theme.description}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1.5">{formatDate(theme.created_at)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(theme)}
                    className="text-brand-primary hover:text-brand-primary-dark p-1.5 rounded-md hover:bg-brand-primary/5 transition-colors"
                    title="Editar tema"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPendingDeleteTheme(theme)}
                    disabled={deleting === theme.id}
                    className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Excluir tema"
                  >
                    {deleting === theme.id ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDeleteTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-neutral-900 mb-2">Excluir tema</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir o tema <strong>&ldquo;{pendingDeleteTheme.title}&rdquo;</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteTheme(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteTheme(pendingDeleteTheme)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditTheme(null) }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              {showEditModal ? 'Editar Tema' : 'Novo Tema'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Tema</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Como a IA está transformando o marketing digital"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Breve descrição do tema e por que é relevante..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditTheme(null) }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={showEditModal ? handleEdit : handleAddManual}
                disabled={!newTitle.trim()}
                className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showEditModal ? 'Salvar Alterações' : 'Adicionar Tema'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const INTERVAL_OPTIONS = [
  { value: 5 / 60, label: 'A cada 5 minutos' },
  { value: 10 / 60, label: 'A cada 10 minutos' },
  { value: 15 / 60, label: 'A cada 15 minutos' },
  { value: 30 / 60, label: 'A cada 30 minutos' },
  { value: 1, label: 'A cada 1 hora' },
  { value: 2, label: 'A cada 2 horas' },
  { value: 4, label: 'A cada 4 horas' },
  { value: 6, label: 'A cada 6 horas' },
  { value: 8, label: 'A cada 8 horas' },
  { value: 12, label: 'A cada 12 horas' },
  { value: 24, label: 'A cada 1 dia' },
  { value: 48, label: 'A cada 2 dias' },
  { value: 72, label: 'A cada 3 dias' },
  { value: 168, label: 'A cada 7 dias' },
]

interface AutomationLogEntry {
  id: number
  triggered_by: string
  status: string
  message: string | null
  post_id: number | null
  error: string | null
  duration_ms: number | null
  started_at: string
  finished_at: string | null
}

function AutomacaoSection() {
  const [enabled, setEnabled] = useState(false)
  const [intervalHours, setIntervalHours] = useState(24)
  const [themeMode, setThemeMode] = useState<'all' | 'specific'>('all')
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([])
  const [customPrompt, setCustomPrompt] = useState('')
  const [themes, setThemes] = useState<ArticleTheme[]>([])
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [nextRunAt, setNextRunAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [imageWarning, setImageWarning] = useState<string | null>(null)
  const [logs, setLogs] = useState<AutomationLogEntry[]>([])
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null)

  async function reloadLogs() {
    const data = await fetch('/api/admin/automation/logs?limit=20')
      .then((r) => (r.ok ? r.json() : { logs: [] })) as { logs?: AutomationLogEntry[] }
    setLogs(data.logs ?? [])
  }

  async function reloadConfig() {
    const data = await fetch('/api/admin/automation').then((r) => r.json()) as {
      last_run_at?: string; next_run_at?: string
    }
    if (data.last_run_at) setLastRunAt(data.last_run_at)
    if (data.next_run_at) setNextRunAt(data.next_run_at)
  }

  useEffect(() => {
    fetch('/api/admin/automation')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: {
        enabled?: boolean
        interval_hours?: number
        theme_ids?: number[]
        custom_prompt?: string
        last_run_at?: string
        next_run_at?: string
      }) => {
        if (data.enabled !== undefined) setEnabled(data.enabled)
        if (data.interval_hours) setIntervalHours(data.interval_hours)
        if (Array.isArray(data.theme_ids) && data.theme_ids.length > 0) {
          setThemeMode('specific')
          setSelectedThemeIds(data.theme_ids)
        }
        if (data.custom_prompt) setCustomPrompt(data.custom_prompt)
        if (data.last_run_at) setLastRunAt(data.last_run_at)
        if (data.next_run_at) setNextRunAt(data.next_run_at)
      })
      .catch(() => {})

    fetch('/api/admin/themes')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { themes?: ArticleTheme[] }) => setThemes(data.themes ?? []))
      .catch(() => {})

    reloadLogs()
  }, [])

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          interval_hours: intervalHours,
          theme_ids: themeMode === 'specific' ? selectedThemeIds : [],
          custom_prompt: customPrompt,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setToast({ type: 'success', msg: 'Configuração salva com sucesso!' })
      await reloadConfig()
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar configuração' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRunNow() {
    setRunning(true)
    setToast(null)
    setImageWarning(null)
    try {
      const res = await fetch('/api/admin/automation/run', { method: 'POST' })
      const data = await res.json() as { success?: boolean; skipped?: boolean; message?: string; error?: string; post_id?: number; image_error?: string }
      if (data.success) {
        setToast({ type: 'success', msg: data.message ?? 'Artigo gerado e publicado!' })
        if (data.image_error) {
          setImageWarning(`Imagem de capa não gerada: ${data.image_error}`)
        }
      } else {
        setToast({ type: 'error', msg: data.message ?? data.error ?? 'Nenhum tema disponível' })
      }
      await Promise.all([reloadConfig(), reloadLogs()])
    } catch {
      setToast({ type: 'error', msg: 'Erro ao executar automação' })
      await reloadLogs()
    } finally {
      setRunning(false)
    }
  }

  function toggleThemeId(id: number) {
    setSelectedThemeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function formatDuration(ms: number | null) {
    if (ms == null) return ''
    if (ms < 1000) return `${ms}ms`
    const s = Math.round(ms / 1000)
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }

  const logStatusConfig: Record<string, { label: string; classes: string }> = {
    running: { label: 'Executando', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    success: { label: 'Sucesso', classes: 'bg-green-50 text-green-700 border-green-200' },
    skipped: { label: 'Ignorado', classes: 'bg-gray-50 text-gray-500 border-gray-200' },
    error: { label: 'Erro', classes: 'bg-red-50 text-red-700 border-red-200' },
  }

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-1">Automação de Postagens</h2>
        <p className="text-sm text-gray-500 mb-6">
          Configure a geração automática de artigos com IA. O sistema selecionará um tema pendente, gerará o artigo completo com imagem de capa e publicará no intervalo configurado.
        </p>

        {toast && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {toast.msg}
          </div>
        )}

        {imageWarning && (
          <div className="mb-5 px-4 py-3 rounded-lg text-sm bg-yellow-50 text-yellow-800 border border-yellow-200">
            <span className="font-medium">Aviso:</span> {imageWarning}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">Automação ativa</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {enabled
                  ? 'O sistema gerará artigos automaticamente no intervalo configurado.'
                  : 'A automação está pausada.'}
              </p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-brand-primary' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo de publicação</label>
            <select
              value={intervalHours}
              onChange={(e) => setIntervalHours(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temas para geração</label>
            <div className="space-y-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={themeMode === 'all'}
                  onChange={() => setThemeMode('all')}
                  className="text-brand-primary"
                />
                <span className="text-sm text-gray-700">Todos os temas pendentes (rotação automática)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={themeMode === 'specific'}
                  onChange={() => setThemeMode('specific')}
                  className="text-brand-primary"
                />
                <span className="text-sm text-gray-700">Selecionar temas específicos</span>
              </label>
            </div>

            {themeMode === 'specific' && (
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {themes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Nenhum tema cadastrado. Crie temas na seção Temas.
                  </p>
                ) : (
                  themes.map((theme) => (
                    <label
                      key={theme.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedThemeIds.includes(theme.id)}
                        onChange={() => toggleThemeId(theme.id)}
                        className="mt-0.5 text-brand-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{theme.title}</p>
                        {theme.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{theme.description}</p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        theme.status === 'used'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {theme.status === 'used' ? 'Usado' : 'Pendente'}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prompt adicional <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Instrução extra injetada na geração de cada artigo. Ex: &ldquo;Sempre inclua exemplos práticos&rdquo;, &ldquo;Use tom mais técnico&rdquo;.
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder="Ex: Sempre inclua ao menos um exemplo prático e uma lista de dicas ao final do artigo."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
            />
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Última execução</p>
              <p className="text-sm text-gray-900">{formatDateTime(lastRunAt)}</p>
            </div>
            <div className="hidden sm:block w-px bg-gray-200" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Próxima execução</p>
              <p className="text-sm text-gray-900">{formatDateTime(nextRunAt)}</p>
            </div>
          </div>
        </div>

        <AdminFormActions align="start">
          <button
            onClick={handleRunNow}
            disabled={running || saving}
            className="flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Gerando artigo...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Executar agora
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || running}
            className="ml-auto bg-brand-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </AdminFormActions>
      </div>

      {/* Execution log history */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Histórico de Execuções</h2>
            <p className="text-sm text-gray-500 mt-0.5">Últimas 20 execuções da automação (agendadas e manuais)</p>
          </div>
          <button
            onClick={reloadLogs}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Atualizar
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <svg className="h-8 w-8 mx-auto mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            <p className="text-sm">Nenhuma execução registrada ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const statusCfg = logStatusConfig[log.status] ?? { label: log.status, classes: 'bg-gray-50 text-gray-500 border-gray-200' }
              const isExpanded = expandedLogId === log.id
              const hasDetail = log.error || log.message

              return (
                <div key={log.id} className="py-3">
                  <div
                    className={`flex items-start gap-3 ${hasDetail ? 'cursor-pointer' : ''}`}
                    onClick={() => hasDetail && setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    <span className={`shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCfg.classes}`}>
                      {statusCfg.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">
                        {log.message ?? (log.status === 'running' ? 'Em execução...' : '—')}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400">{formatDateTime(log.started_at)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          log.triggered_by === 'manual'
                            ? 'bg-purple-50 text-purple-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {log.triggered_by === 'manual' ? 'Manual' : 'Agendado'}
                        </span>
                        {log.duration_ms != null && log.duration_ms > 0 && (
                          <span className="text-xs text-gray-400">{formatDuration(log.duration_ms)}</span>
                        )}
                        {log.post_id && (
                          <a
                            href={`/admin/artigos/${log.post_id}/editar`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-brand-primary hover:underline"
                          >
                            Ver artigo #{log.post_id}
                          </a>
                        )}
                      </div>
                    </div>
                    {hasDetail && (
                      <span className="shrink-0 text-gray-300 text-xs mt-1">{isExpanded ? '▲' : '▼'}</span>
                    )}
                  </div>
                  {isExpanded && hasDetail && (
                    <div className="mt-2 ml-0 bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-300 whitespace-pre-wrap break-all">
                      {log.error ?? log.message}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function CategoriasSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingDeleteCat, setPendingDeleteCat] = useState<Category | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchCategories() {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data.categories ?? [])
  }

  useEffect(() => { fetchCategories() }, [])

  async function handleSave() {
    setError('')
    setLoading(true)
    try {
      const url = editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao salvar'); return }
      setName(''); setDescription(''); setEditing(null)
      await fetchCategories()
    } catch { setError('Erro de conexão') }
    finally { setLoading(false) }
  }

  async function confirmDeleteCat(cat: Category) {
    setPendingDeleteCat(null)
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      showToast('error', data.error ?? 'Erro ao excluir categoria')
      return
    }
    showToast('success', `Categoria "${cat.name}" excluída com sucesso!`)
    await fetchCategories()
  }

  return (
    <div>
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {pendingDeleteCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-neutral-900 mb-2">Excluir categoria</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir a categoria <strong>&ldquo;{pendingDeleteCat.name}&rdquo;</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteCat(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteCat(pendingDeleteCat)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-medium text-neutral-900 mb-4">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Descrição (opcional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <AdminFormActions>
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setName(''); setDescription('') }}>Cancelar</Button>}
          <Button onClick={handleSave} loading={loading}>{editing ? 'Salvar' : 'Adicionar'}</Button>
        </AdminFormActions>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{cat.description ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setEditing(cat); setName(cat.name); setDescription(cat.description ?? '') }} className="text-brand-primary hover:underline text-sm">Editar</button>
                    <button onClick={() => setPendingDeleteCat(cat)} className="text-red-600 hover:underline text-sm">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TagsSection() {
  const [tags, setTags] = useState<Tag[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [pendingDeleteTag, setPendingDeleteTag] = useState<Tag | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchTags() {
    const res = await fetch('/api/admin/tags')
    const data = await res.json()
    setTags(data.tags ?? [])
  }

  useEffect(() => { fetchTags() }, [])

  async function handleAdd() {
    if (!input.trim()) return
    setError('')
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erro ao criar tag'); return }
    setInput('')
    await fetchTags()
  }

  async function confirmDeleteTag(tag: Tag) {
    setPendingDeleteTag(null)
    const res = await fetch(`/api/admin/tags/${tag.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      showToast('error', data.error ?? 'Erro ao excluir tag')
      return
    }
    showToast('success', `Tag "${tag.name}" excluída com sucesso!`)
    await fetchTags()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  return (
    <div>
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {pendingDeleteTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-neutral-900 mb-2">Excluir tag</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir a tag <strong>&ldquo;{pendingDeleteTag.name}&rdquo;</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteTag(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteTag(pendingDeleteTag)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex gap-3">
          <input
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Nome da tag (Enter para adicionar)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button onClick={handleAdd} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors">
            Adicionar
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag.id} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm">
            {tag.name}
            <button
              onClick={() => setPendingDeleteTag(tag)}
              aria-label={`Excluir tag ${tag.name}`}
              className="text-gray-400 hover:text-red-600 transition-colors ml-0.5"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
        {tags.length === 0 && <p className="text-gray-400 text-sm">Nenhuma tag ainda. Adicione a primeira acima.</p>}
      </div>
    </div>
  )
}

function ConfiguracaoArtigosSection() {
  const [config, setConfig] = useState<ArticleGenerationConfig>(ARTICLE_CONFIG_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/article-config')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { config?: ArticleGenerationConfig }) => {
        if (data.config) setConfig(data.config)
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/article-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')
      setConfig(data.config)
      setToast({ type: 'success', msg: 'Configurações salvas com sucesso!' })
    } catch (err) {
      setToast({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar' })
    } finally {
      setSaving(false)
    }
  }

  function set<K extends keyof ArticleGenerationConfig>(key: K, value: ArticleGenerationConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-1">Configurações de Geração</h2>
      <p className="text-sm text-gray-500 mb-6">
        Defina o padrão de todos os artigos gerados por IA — automação e geração manual. Essas configurações são injetadas automaticamente nos prompts.
      </p>

      {toast && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho mínimo do artigo</label>
          <select
            value={config.minWords}
            onChange={(e) => set('minWords', Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            <option value={600}>600 palavras</option>
            <option value={800}>800 palavras</option>
            <option value={1000}>1000 palavras</option>
            <option value={1200}>1200 palavras</option>
            <option value={1500}>1500 palavras</option>
            <option value={2000}>2000 palavras</option>
            <option value={2500}>2500 palavras</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tom de voz</label>
          <select
            value={config.voiceTone}
            onChange={(e) => set('voiceTone', e.target.value as ArticleVoiceTone)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            <option value="profissional">Profissional</option>
            <option value="informal">Informal</option>
            <option value="tecnico">Técnico</option>
            <option value="jornalistico">Jornalístico</option>
            <option value="descontraido">Descontraído</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
          <select
            value={config.language}
            onChange={(e) => set('language', e.target.value as ArticleLanguage)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            <option value="pt-BR">Português (BR)</option>
            <option value="en">Inglês</option>
            <option value="es">Espanhol</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Criatividade (temperatura) — {config.creativity.toFixed(1)}
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Valores mais altos geram textos mais criativos e variados. Valores mais baixos geram textos mais previsíveis e conservadores.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16">Conservador</span>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.1}
              value={config.creativity}
              onChange={(e) => set('creativity', Number(e.target.value))}
              className="flex-1 accent-brand-primary"
            />
            <span className="text-xs text-gray-400 w-16 text-right">Criativo</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Elementos de formato</label>
          <div className="space-y-2">
            {[
              { key: 'includeLists', label: 'Incluir listas (ul/ol)' },
              { key: 'includeExamples', label: 'Incluir exemplos práticos' },
              { key: 'includeQuotes', label: 'Incluir blockquotes / citações' },
              { key: 'includeTables', label: 'Incluir tabelas' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[key as keyof ArticleGenerationConfig] as boolean}
                  onChange={(e) => set(key as keyof ArticleGenerationConfig, e.target.checked as never)}
                  className="rounded accent-brand-primary"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instruções adicionais fixas <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Essas instruções são adicionadas a todos os prompts de geração. Ex: &ldquo;Sempre termine com 3 perguntas para o leitor&rdquo;, &ldquo;Mencione o esporte sempre que possível&rdquo;.
          </p>
          <textarea
            value={config.extraInstructions}
            onChange={(e) => set('extraInstructions', e.target.value)}
            rows={4}
            placeholder="Ex: Sempre cite pelo menos uma estatística. Termine o artigo com uma chamada para ação relacionada ao esporte."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
          />
        </div>
      </div>

      <AdminFormActions>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </AdminFormActions>
    </section>
  )
}
