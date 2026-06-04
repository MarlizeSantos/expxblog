'use client'

import { useState } from 'react'
import { trackFacebookLead } from '@/components/blog/FacebookPixel'
import type { FacebookPixelConfig } from '@/lib/settings'

interface Props {
  title?: string
  subtitle?: string
  facebookPixelConfig?: FacebookPixelConfig
}

export function NewsletterSection({
  title = 'Fique por dentro das novidades',
  subtitle = 'Receba os melhores artigos diretamente no seu e-mail.',
  facebookPixelConfig,
}: Props) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !consent) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Erro ao se inscrever.')
        setStatus('error')
        return
      }
      setStatus('success')
      // Dispara evento Lead no Facebook Pixel (se configurado e consentimento dado)
      if (facebookPixelConfig) trackFacebookLead(facebookPixelConfig)
    } catch {
      setErrorMsg('Erro ao se inscrever. Tente novamente.')
      setStatus('error')
    }
  }

  return (
    <section className="my-12 rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-primary)' }}>
      <div className="px-8 py-12 text-center max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-white/70 text-sm mb-8 max-w-lg mx-auto">{subtitle}</p>
        {status === 'success' ? (
          <p className="text-white font-medium">&#10003; Obrigado! Você está inscrito na nossa newsletter.</p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  required
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !consent}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap hover:opacity-90 transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                  {status === 'loading' ? 'Aguarde...' : 'Inscrever-se'}
                </button>
              </div>

              {/* Consentimento LGPD — Art. 8º: consentimento explícito e informado */}
              <label className="flex items-start gap-2 cursor-pointer text-left">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={status === 'loading'}
                  required
                  className="mt-0.5 h-4 w-4 rounded border-white/40 accent-white flex-shrink-0"
                />
                <span className="text-white/70 text-xs leading-relaxed">
                  Li e aceito a{' '}
                  <a
                    href="/politica-de-privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline hover:text-white/90 transition-colors"
                  >
                    Política de Privacidade
                  </a>
                  . Meu e-mail será usado exclusivamente para envio de artigos e posso cancelar a qualquer momento.
                </span>
              </label>
            </form>
            {status === 'error' && (
              <p className="mt-3 text-white/80 text-sm">{errorMsg}</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
