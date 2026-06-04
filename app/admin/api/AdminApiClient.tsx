'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
import { Button } from '@/components/ui/Button'

interface ApiToken {
  id: number
  name: string
  token: string
  active: string
  last_used_at: string | null
  created_at: string
  isNew?: boolean
}

type Toast = { type: 'success' | 'error'; msg: string }

export function AdminApiClient() {
  usePageTitle('API', 'Gerencie os tokens de acesso à API pública do blog')
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revealedToken, setRevealedToken] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ApiToken | null>(null)

  function showToast(type: Toast['type'], msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/api-tokens')
      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens)
      }
    } catch {
      showToast('error', 'Erro ao carregar tokens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTokens()
  }, [fetchTokens])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao criar token')
      }
      const data = await res.json()
      setNewName('')
      setRevealedToken(data.token.token)
      setTokens((prev) => [{ ...data.token, isNew: true }, ...prev])
      showToast('success', 'Token criado com sucesso! Copie-o agora, pois não será exibido novamente.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao criar token')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(id: number, currentActive: string) {
    const newActive = currentActive === 'true' ? false : true
    try {
      const res = await fetch(`/api/admin/api-tokens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao atualizar token')
      }
      const data = await res.json()
      setTokens((prev) => prev.map((t) => (t.id === id ? data.token : t)))
      showToast('success', newActive ? 'Token ativado' : 'Token desativado')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao atualizar token')
    }
  }

  async function confirmDelete(token: ApiToken) {
    try {
      const res = await fetch(`/api/admin/api-tokens/${token.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao excluir token')
      }
      setTokens((prev) => prev.filter((t) => t.id !== token.id))
      showToast('success', 'Token excluído com sucesso')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao excluir token')
    } finally {
      setPendingDelete(null)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    showToast('success', 'Token copiado para a área de transferência!')
  }

  function maskToken(token: string): string {
    if (token.length <= 12) return '••••••••'
    return token.substring(0, 8) + '••••••••••••' + token.substring(token.length - 4)
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Nunca'
    return new Date(dateStr).toLocaleString('pt-BR')
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-8">
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-brand-primary text-brand-primary hover:bg-brand-primary/10 transition-colors"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Documentação da API
        </a>
      </div>

      {toast && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm border ${
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
            <h3 className="text-base font-semibold text-neutral-900 mb-2">Excluir token</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir o token <strong>&ldquo;{pendingDelete.name}&rdquo;</strong>?
              Esta ação não pode ser desfeita e qualquer integração que use este token deixará de funcionar.
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

      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Criar novo token</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do token (ex: Integração App Mobile)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
          />
          <Button onClick={() => void handleCreate()} loading={creating}>
            Gerar Token
          </Button>
        </div>

        {revealedToken && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Copie o token agora. Por segurança, ele não será exibido novamente:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded text-xs font-mono break-all border border-blue-200">
                {revealedToken}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(revealedToken)}
              >
                Copiar
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Tokens gerados</h2>

        {loading ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum token criado ainda. Crie um acima para começar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-medium text-gray-600">Nome</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-600">Token</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-600">Último uso</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-600">Criado em</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-neutral-900">{token.name}</td>
                    <td className="py-3 px-3">
                      <code className="text-xs font-mono text-gray-500">
                        {token.isNew ? revealedToken : maskToken(token.token)}
                      </code>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        token.active === 'true'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {token.active === 'true' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">{formatDate(token.last_used_at)}</td>
                    <td className="py-3 px-3 text-gray-500">{formatDate(token.created_at)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleToggle(token.id, token.active)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            token.active === 'true'
                              ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                              : 'border-green-300 text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {token.active === 'true' ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => setPendingDelete(token)}
                          className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">Como usar a API</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>Para acessar os endpoints da API, envie o token no header <code className="bg-gray-200 px-1 rounded">Authorization</code>:</p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
            {`Authorization: Bearer blog_seu_token_aqui`}
          </pre>
          <p className="mt-3">
            Acesse a <a href="/docs" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline font-medium">documentação completa da API</a> para ver todos os endpoints disponíveis.
          </p>
        </div>
      </section>
    </div>
  )
}
