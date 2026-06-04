'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ui/ImageUpload'
import dynamic from 'next/dynamic'

const TiptapEditor = dynamic(() => import('@/components/blog/TiptapEditor'), { ssr: false })

interface Category { id: number; name: string }
interface Tag { id: number; name: string }

interface Props {
  id: string
}

export function EditarArtigoClient({ id }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/posts/${id}`).then(r => r.json()),
      fetch('/api/admin/categories').then(r => r.json()),
      fetch('/api/admin/tags').then(r => r.json()),
    ]).then(([postData, cData, tData]) => {
      const post = postData.post
      if (post) {
        setTitle(post.title)
        setSlug(post.slug)
        setExcerpt(post.excerpt)
        setContent(post.content)
        setCoverImage(post.cover_image ?? '')
        setAuthorName(post.author_name ?? '')
        setSelectedCategories(post.categories?.map((c: Category) => c.id) ?? [])
        setSelectedTags(post.tags?.map((t: Tag) => t.id) ?? [])
      }
      setCategories(cData.categories ?? [])
      setTags(tData.tags ?? [])
    }).finally(() => setFetching(false))
  }, [id])

  async function handleSubmit(status: 'draft' | 'published') {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, slug, excerpt, content,
          author_name: authorName || null,
          cover_image: coverImage || null,
          status,
          category_ids: selectedCategories,
          tag_ids: selectedTags,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao salvar'); return }
      router.push('/admin/artigos')
    } catch { setError('Erro de conexão') }
    finally { setLoading(false) }
  }

  if (fetching) return <div className="text-center py-16 text-gray-400">Carregando artigo...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Editar Artigo</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input value={slug} onChange={e => setSlug(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resumo ({excerpt.length}/160)</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} maxLength={160} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Autor</label>
            <input
              value={authorName} onChange={e => setAuthorName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Deixe vazio para usar o nome do blog"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
            <TiptapEditor content={content} onChange={setContent} />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagem de Capa</label>
            <ImageUpload value={coverImage} onChange={setCoverImage} aiContext={{ title, excerpt, content }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categorias</label>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedCategories.includes(cat.id)}
                    onChange={e => setSelectedCategories(e.target.checked ? [...selectedCategories, cat.id] : selectedCategories.filter(id => id !== cat.id))}
                    className="accent-brand-primary" />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-1 border border-gray-200 rounded-lg p-2 min-h-10">
              {tags.map(tag => (
                <button key={tag.id} type="button"
                  onClick={() => setSelectedTags(selectedTags.includes(tag.id) ? selectedTags.filter(id => id !== tag.id) : [...selectedTags, tag.id])}
                  className={`px-2 py-0.5 rounded-full text-xs transition-colors ${selectedTags.includes(tag.id) ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
        <Button variant="ghost" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
        <Button variant="ghost" onClick={() => handleSubmit('draft')} loading={loading} className="bg-gray-600 text-white hover:bg-gray-700 border-0">Salvar Rascunho</Button>
        <Button onClick={() => handleSubmit('published')} loading={loading}>Publicar</Button>
      </div>
    </div>
  )
}
