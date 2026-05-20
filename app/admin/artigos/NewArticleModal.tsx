'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ArticleTheme {
  id: number
  title: string
  description: string | null
  source: string
  status: string
}

interface Suggestion {
  title: string
  description: string
}

type Step =
  | 'method'
  | 'ai_type'
  | 'select_theme'
  | 'loading_suggestions'
  | 'select_suggestion'
  | 'enter_url'
  | 'generating'
  | 'generating_image'

interface Props {
  open: boolean
  onClose: () => void
}

export default function NewArticleModal({ open, onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('method')
  const [themes, setThemes] = useState<ArticleTheme[]>([])
  const [selectedTheme, setSelectedTheme] = useState<ArticleTheme | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setStep('method')
      setSelectedTheme(null)
      setSuggestions([])
      setUrl('')
      setError('')
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

  async function generateCoverImage(
    postId: number,
    title: string,
    excerpt: string,
    content: string
  ): Promise<void> {
    try {
      const imgRes = await fetch('/api/admin/ai/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, excerpt, content }),
      })
      if (!imgRes.ok) return
      const { url: coverImageUrl } = await imgRes.json()
      if (!coverImageUrl) return
      await fetch(`/api/admin/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_image: coverImageUrl }),
      })
    } catch {
      // image generation is non-fatal; article is already saved
    }
  }

  function handleManual() {
    onClose()
    router.push('/admin/artigos/novo')
  }

  async function handleSelectTheme(theme: ArticleTheme) {
    setSelectedTheme(theme)
    setStep('loading_suggestions')
    setError('')
    try {
      const res = await fetch('/api/admin/ai/article/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: theme.title,
          theme_description: theme.description,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar sugestões')
      setSuggestions(data.suggestions ?? [])
      setStep('select_suggestion')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar sugestões')
      setStep('select_theme')
    }
  }

  async function handleSelectSuggestion(suggestion: Suggestion) {
    setStep('generating')
    setError('')
    try {
      const res = await fetch('/api/admin/ai/article/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar artigo')
      setStep('generating_image')
      await generateCoverImage(data.post_id, data.title, data.excerpt, data.content)
      onClose()
      router.push(`/admin/artigos/${data.post_id}/editar`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar artigo')
      setStep('select_suggestion')
    }
  }

  async function handleGenerateFromUrl() {
    if (!url.trim()) return
    setStep('generating')
    setError('')
    try {
      const res = await fetch('/api/admin/ai/article/generate-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar artigo')
      setStep('generating_image')
      await generateCoverImage(data.post_id, data.title, data.excerpt, data.content)
      onClose()
      router.push(`/admin/artigos/${data.post_id}/editar`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar artigo')
      setStep('enter_url')
    }
  }

  function goBack() {
    switch (step) {
      case 'ai_type':
        setStep('method')
        break
      case 'select_theme':
      case 'enter_url':
        setStep('ai_type')
        break
      case 'select_suggestion':
        setStep('select_theme')
        break
    }
  }

  if (!open) return null

  const titles: Record<Step, string> = {
    method: 'Novo Artigo',
    ai_type: 'Criar com IA',
    select_theme: 'Escolha um Tema',
    loading_suggestions: 'Buscando Sugestões...',
    select_suggestion: 'Escolha um Artigo',
    enter_url: 'Link de Referência',
    generating: 'Gerando Artigo...',
    generating_image: 'Gerando Imagem de Capa...',
  }

  const canGoBack =
    step !== 'method' &&
    step !== 'generating' &&
    step !== 'generating_image' &&
    step !== 'loading_suggestions'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-neutral-900">{titles[step]}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}

          {step === 'method' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleManual}
                className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                <svg
                  className="h-10 w-10 text-gray-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span className="text-sm font-semibold text-neutral-900">Manual</span>
                <span className="text-xs text-gray-500 text-center">
                  Escrever artigo do zero
                </span>
              </button>
              <button
                onClick={() => setStep('ai_type')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                <svg
                  className="h-10 w-10 text-brand-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                </svg>
                <span className="text-sm font-semibold text-neutral-900">Com IA</span>
                <span className="text-xs text-gray-500 text-center">
                  Gerar artigo com inteligência artificial
                </span>
              </button>
            </div>
          )}

          {step === 'ai_type' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStep('select_theme')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                <svg
                  className="h-10 w-10 text-brand-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
                </svg>
                <span className="text-sm font-semibold text-neutral-900">
                  Temas Sugeridos
                </span>
                <span className="text-xs text-gray-500 text-center">
                  Escolha um tema cadastrado e receba sugestões de artigos da IA
                </span>
              </button>
              <button
                onClick={() => setStep('enter_url')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
              >
                <svg
                  className="h-10 w-10 text-brand-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                <span className="text-sm font-semibold text-neutral-900">
                  Link de Referência
                </span>
                <span className="text-xs text-gray-500 text-center">
                  Cole um link e a IA cria um artigo baseado no conteúdo
                </span>
              </button>
            </div>
          )}

          {step === 'select_theme' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Selecione um dos temas cadastrados no sistema para receber sugestões de
                artigos:
              </p>
              {themes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhum tema cadastrado. Cadastre temas na seção &quot;Temas&quot; do menu
                  lateral.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleSelectTheme(theme)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900">
                            {theme.title}
                          </div>
                          {theme.description && (
                            <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                              {theme.description}
                            </div>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide shrink-0 ${
                            theme.source === 'ai'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {theme.source === 'ai' ? 'IA' : 'Manual'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'loading_suggestions' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <svg
                className="animate-spin h-8 w-8 text-brand-primary"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-gray-500">
                Buscando sugestões de artigos sobre &quot;{selectedTheme?.title}&quot;...
              </p>
            </div>
          )}

          {step === 'select_suggestion' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                A IA sugeriu {suggestions.length} artigos com base no tema{' '}
                <span className="font-medium text-neutral-900">
                  &quot;{selectedTheme?.title}&quot;
                </span>{' '}
                e no briefing da empresa. Selecione um para gerar:
              </p>
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-medium flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-colors">
                        {i + 1}
                      </span>
                      <div>
                        <div className="font-medium text-neutral-900">{s.title}</div>
                        <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {s.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'enter_url' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Cole o link do artigo de referência e a IA criará um novo artigo original
                baseado no conteúdo.
              </p>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://exemplo.com/artigo"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  autoFocus
                />
                <button
                  onClick={handleGenerateFromUrl}
                  disabled={!url.trim()}
                  className="bg-brand-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Gerar Artigo
                </button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <svg
                className="animate-spin h-8 w-8 text-brand-primary"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-gray-500">
                Gerando artigo com IA, isso pode levar alguns minutos...
              </p>
            </div>
          )}

          {step === 'generating_image' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <svg
                className="animate-spin h-8 w-8 text-brand-secondary"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-gray-500">
                Artigo gerado! Criando imagem de capa com IA...
              </p>
              <p className="text-xs text-gray-400">Isso pode levar até 30 segundos.</p>
            </div>
          )}
        </div>

        {canGoBack && (
          <div className="px-6 pb-6">
            <button
              onClick={goBack}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              &larr; Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
