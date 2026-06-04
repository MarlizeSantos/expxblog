'use client'

import { useState, useEffect } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
import { Button } from '@/components/ui/Button'
import type { Category } from '@/lib/admin-types'

type Toast = { type: 'success' | 'error'; msg: string }

export function CategoriasClient() {
  usePageTitle('Categorias')
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  function showToast(type: Toast['type'], msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchCategories() {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data.categories ?? [])
  }

  useEffect(() => { void fetchCategories() }, [])

  async function handleSave() {
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
      if (!res.ok) { showToast('error', data.error ?? 'Erro ao salvar'); return }
      setName(''); setDescription(''); setEditing(null)
      showToast('success', editing ? 'Categoria atualizada!' : 'Categoria criada!')
      await fetchCategories()
    } catch { showToast('error', 'Erro de conexão') }
    finally { setLoading(false) }
  }

  async function confirmDelete(cat: Category) {
    const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      showToast('error', data.error ?? 'Erro ao excluir categoria')
    } else {
      showToast('success', `Categoria "${cat.name}" excluída.`)
      await fetchCategories()
    }
    setPendingDelete(null)
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
            <h3 className="text-base font-semibold text-neutral-900 mb-2">Excluir categoria</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir a categoria <strong>&ldquo;{pendingDelete.name}&rdquo;</strong>?
              Os artigos associados não serão excluídos.
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
        <h2 className="font-medium text-neutral-900 mb-4">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h2>
        <div className="flex gap-3 items-end">
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
          <Button onClick={() => void handleSave()} loading={loading}>{editing ? 'Salvar' : 'Adicionar'}</Button>
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setName(''); setDescription('') }}>Cancelar</Button>}
        </div>
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
                    <button onClick={() => setPendingDelete(cat)} className="text-red-600 hover:underline text-sm">Excluir</button>
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
