'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getConsentStatus } from '@/lib/consent'
import type { FacebookPixelConfig } from '@/lib/settings'

// Declaração global para fbq (evitar any)
declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void
      queue: unknown[]
      loaded: boolean
      version: string
    }
    _fbq?: typeof window.fbq
  }
}

interface Props {
  config: FacebookPixelConfig
}

export function FacebookPixel({ config }: Props) {
  const { enabled, pixel_ids, track_pageview } = config
  const initialized = useRef(false)
  const scriptLoaded = useRef(false)
  const [consented, setConsented] = useState(false)
  const pathname = usePathname()

  // Tenta inicializar os pixels (idempotente — guarda via initialized.current)
  const tryInit = useCallback(() => {
    if (initialized.current) return
    if (!enabled || !consented || pixel_ids.length === 0) return
    if (!scriptLoaded.current) return
    if (typeof window.fbq !== 'function') return

    pixel_ids.forEach((id) => {
      window.fbq('init', id)
    })
    initialized.current = true

    // Dispara PageView inicial logo após init
    if (track_pageview) {
      window.fbq('track', 'PageView')
    }
  }, [enabled, consented, pixel_ids, track_pageview])

  // Verificar consentimento inicial e escutar mudanças
  useEffect(() => {
    const status = getConsentStatus()
    if (status === 'accepted') {
      setConsented(true)
    }

    function handleConsentChange(e: Event) {
      const detail = (e as CustomEvent<{ status: string }>).detail
      if (detail.status === 'accepted') {
        setConsented(true)
      }
    }

    window.addEventListener('lgpd-consent-change', handleConsentChange)
    return () => window.removeEventListener('lgpd-consent-change', handleConsentChange)
  }, [])

  // Tentar inicializar quando consentimento mudar (script pode já ter carregado)
  useEffect(() => {
    if (consented && scriptLoaded.current) {
      tryInit()
    }
  }, [consented, tryInit])

  // PageView a cada navegação após inicializado
  useEffect(() => {
    if (!enabled || !consented || !initialized.current || !track_pageview) return
    window.fbq('track', 'PageView')
  }, [pathname, enabled, consented, track_pageview])

  if (!enabled || pixel_ids.length === 0) return null

  // Nota: bloco <noscript> removido intencionalmente.
  // O consentimento LGPD é lido via JS (localStorage); sem JS não há como
  // verificar aceite, portanto nenhum tracking deve ocorrer (noscript dispararia
  // incondicionalmente, violando LGPD).
  return (
    <Script
      id="facebook-pixel-base"
      strategy="lazyOnload"
      onLoad={() => {
        scriptLoaded.current = true
        tryInit()
      }}
      dangerouslySetInnerHTML={{
        __html: `
!function(f,b,e,v,n,t,s){
if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
`,
      }}
    />
  )
}

// Hook para disparar ViewContent em páginas de artigo
export function useFacebookViewContent(
  config: FacebookPixelConfig,
  options: { contentName: string; contentCategory?: string }
) {
  const { enabled, track_viewcontent } = config

  useEffect(() => {
    if (!enabled || !track_viewcontent) return
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
    if (getConsentStatus() !== 'accepted') return

    window.fbq('track', 'ViewContent', {
      content_name: options.contentName,
      content_category: options.contentCategory ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// Função helper para disparar Lead (newsletter)
export function trackFacebookLead(config: FacebookPixelConfig) {
  if (!config.enabled || !config.track_lead) return
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  if (getConsentStatus() !== 'accepted') return
  window.fbq('track', 'Lead')
}
