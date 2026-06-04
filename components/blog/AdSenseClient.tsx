'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { getConsentStatus } from '@/lib/consent'

interface Props {
  publisherId: string
}

/**
 * Client Component que injeta o script do Google AdSense (Auto Ads) APENAS
 * após o consentimento de cookies (LGPD). O consentimento vive no localStorage
 * e só é legível no browser — por isso o gate precisa ser client-side, espelhando
 * o comportamento de FacebookPixel.
 */
export function AdSenseClient({ publisherId }: Props) {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    if (getConsentStatus() === 'accepted') {
      setConsented(true)
    }

    function handleConsentChange(e: Event) {
      const detail = (e as CustomEvent<{ status: string }>).detail
      if (detail.status === 'accepted') setConsented(true)
    }

    window.addEventListener('lgpd-consent-change', handleConsentChange)
    return () => window.removeEventListener('lgpd-consent-change', handleConsentChange)
  }, [])

  if (!consented) return null

  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  )
}
