'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getConsentStatus, setConsentStatus, hasDecided } from '@/lib/consent'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Verifica após hidratação se o usuário já decidiu
    if (!hasDecided()) {
      setVisible(true)
    }
  }, [])

  function handleAccept() {
    setConsentStatus('accepted')
    setVisible(false)
  }

  function handleReject() {
    setConsentStatus('rejected')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Banner de consentimento de cookies"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
    >
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Ícone */}
        <div className="flex-shrink-0 text-brand-primary">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Texto */}
        <p className="flex-1 text-sm text-gray-700 leading-relaxed">
          Usamos cookies e tecnologias de rastreamento para melhorar sua experiência e exibir
          conteúdo relevante. Ao clicar em{' '}
          <strong className="font-semibold text-neutral-900">Aceitar</strong>, você consente com
          o uso dessas tecnologias, incluindo o Facebook Pixel (Meta). Veja nossa{' '}
          <Link
            href="/politica-de-privacidade"
            className="text-brand-primary underline hover:opacity-80 transition-opacity"
          >
            Política de Privacidade
          </Link>
          .
        </p>

        {/* Botões */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleReject}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}
