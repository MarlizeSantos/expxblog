// lib/consent.ts
// Helper para leitura e escrita do consentimento de cookies LGPD.
// Utilizável por Client Components (executa apenas no browser).

const CONSENT_KEY = 'lgpd_cookie_consent'
const CONSENT_VERSION = 'v1'

export type ConsentStatus = 'accepted' | 'rejected' | null

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { status: string; version: string }
    if (parsed.version !== CONSENT_VERSION) return null
    if (parsed.status === 'accepted') return 'accepted'
    if (parsed.status === 'rejected') return 'rejected'
    return null
  } catch {
    return null
  }
}

export function setConsentStatus(status: 'accepted' | 'rejected'): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ status, version: CONSENT_VERSION }))
  // Dispara evento customizado para que outros componentes reajam imediatamente
  window.dispatchEvent(new CustomEvent('lgpd-consent-change', { detail: { status } }))
}

export function hasDecided(): boolean {
  return getConsentStatus() !== null
}
