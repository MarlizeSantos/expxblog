'use client'

import { useState, useEffect, type KeyboardEvent } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
import type { Tag } from '@/lib/admin-types'

type Toast = { type: 'success' | 'error'; msg: string }

export function TagsClient() {
  usePageTitle('Tags')
  const [tags, setTags] = useState<Tag[]>([])
  const [input, setInput] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null)

  function showToast(type: Toast['type'], msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchTags() {
    const res = await fetch('/api/admin/tags')
    const data = await res.json()
    setTags(data.tags ?? [])
  }

  useEffect(() => { void fetchTags() }, [])

  async function handleAdd() {
    if (!input.trim()) return
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { showToast('error', data.error ?? 'Erro ao criar tag'); return }
    setInput('')
    showToast('success', 'Tag criada com sucesso!')
    await fetchTags()
  }

  async function confirmDelete(tag: Tag) {
    const res = await fetch(`/api/admin/tags/${tag.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      showToast('error', data.error ?? 'Erro ao excluir tag')
    } else {
      showToast('success', `Tag "${tag.name}" excluída.`)
      await fetchTags()
    }
    setPendingDelete(null)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); void handleAdd() }
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

      {/* Modal de confirmação de exclusão */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-neutral-900 mb-2">Excluir tag</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir a tag <strong>&ldquo;{pendingDelete.name}&rdquo;</strong>? Esta ação não pode ser desfeita.
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

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex gap-3">
          <input
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Nome da tag (Enter para adicionar)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button onClick={() => void handleAdd()} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary/90 transition-colors">
            Adicionar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag.id} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm">
            {tag.name}
            <button
              onClick={() => setPendingDelete(tag)}
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
