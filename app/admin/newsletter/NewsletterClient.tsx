'use client'

import { useState, useEffect } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
import { Button } from '@/components/ui/Button'
import type { NewsletterConfig } from '@/lib/settings'
import { AdminFormActions } from '@/components/admin/AdminFormActions'

interface Subscriber {
  id: number
  email: string
  status: 'active' | 'unsubscribed'
  subscribed_at: string
  unsubscribed_at: string | null
}

interface Props {
  initialConfig: NewsletterConfig
}

export function NewsletterClient({ initialConfig }: Props) {
  const [config, setConfig] = useState<NewsletterConfig>(initialConfig)
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loadingSubscribers, setLoadingSubscribers] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [unsubscribing, setUnsubscribing] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/newsletter')
      .then((r) => r.json())
      .then((data) => {
        setSubscribers(
          (data.subscribers ?? []).map((s: Subscriber & { subscribed_at: string | Date; unsubscribed_at: string | Date | null }) => ({
            ...s,
            subscribed_at: typeof s.subscribed_at === 'string' ? s.subscribed_at : new Date(s.subscribed_at).toISOString(),
            unsubscribed_at: s.unsubscribed_at
              ? typeof s.unsubscribed_at === 'string'
                ? s.unsubscribed_at
                : new Date(s.unsubscribed_at).toISOString()
              : null,
          }))
        )
      })
      .catch(() => {})
      .finally(() => setLoadingSubscribers(false))
  }, [])

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletter: config }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Falha ao salvar')
      }
      showToast('success', 'Configurações salvas com sucesso!')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnsubscribe(id: number) {
    setUnsubscribing(id)
    try {
      const res = await fetch(`/api/admin/newsletter?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao cancelar inscrição')
      setSubscribers((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: 'unsubscribed', unsubscribed_at: new Date().toISOString() } : s
        )
      )
    } catch {
      showToast('error', 'Erro ao cancelar inscrição.')
    } finally {
      setUnsubscribing(null)
    }
  }

  const activeCount = subscribers.filter((s) => s.status === 'active').length

  usePageTitle(
    'Newsletter',
    `${activeCount} inscrito${activeCount !== 1 ? 's' : ''} ativo${activeCount !== 1 ? 's' : ''}`
  )

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

      <div className="space-y-6">
        {/* Config section */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Configurações do Card de Inscrição</h2>
          <p className="text-sm text-gray-500 mb-5">
            Personalize o card de inscrição exibido no blog. Para configurar o envio de e-mails, acesse{' '}
            <a href="/admin/configuracoes" className="text-brand-primary underline">
              Configurações → Resend (Email)
            </a>
            .
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800">Habilitar Newsletter</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Exibe o card de inscrição em todas as páginas do blog
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enabled ? 'bg-brand-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    config.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Card</label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={200}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo do Card</label>
              <textarea
                value={config.subtitle}
                onChange={(e) => setConfig((prev) => ({ ...prev, subtitle: e.target.value }))}
                maxLength={500}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              />
            </div>
          </div>

          <AdminFormActions>
            <Button onClick={handleSave} loading={saving}>
              Salvar configurações
            </Button>
          </AdminFormActions>
        </section>

        {/* Subscribers list */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-5">Inscritos</h2>

          {loadingSubscribers ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : subscribers.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum inscrito ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-600 pb-3">E-mail</th>
                    <th className="text-left font-medium text-gray-600 pb-3">Data de inscrição</th>
                    <th className="text-left font-medium text-gray-600 pb-3">Status</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 text-gray-800">{sub.email}</td>
                      <td className="py-3 pr-4 text-gray-500">
                        {new Date(sub.subscribed_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            sub.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {sub.status === 'active' ? 'Ativo' : 'Cancelado'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {sub.status === 'active' && (
                          <button
                            onClick={() => handleUnsubscribe(sub.id)}
                            disabled={unsubscribing === sub.id}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                          >
                            {unsubscribing === sub.id ? 'Cancelando...' : 'Cancelar inscrição'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
