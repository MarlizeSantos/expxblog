import { NextResponse } from 'next/server'
import { getAdSenseConfig } from '@/lib/db-queries'

export const dynamic = 'force-dynamic'

/**
 * Serve o arquivo ads.txt obrigatório para validação do Google AdSense.
 * Formato correto: "google.com, pub-XXXXXXXXXX, DIRECT, f08c47fec0942fa0"
 * (note: AdSense usa "pub-..." sem o prefixo "ca-" no ads.txt)
 * Retorna 404 quando AdSense está desabilitado ou publisher_id está ausente.
 */
export async function GET() {
  const { enabled, publisher_id } = await getAdSenseConfig()

  const publisherIdRegex = /^ca-pub-\d{10,}$/
  if (!enabled || !publisher_id || !publisherIdRegex.test(publisher_id)) {
    return new NextResponse(null, { status: 404 })
  }

  // O formato do ads.txt do Google usa "pub-..." (sem o prefixo "ca-")
  const normalizedPubId = publisher_id.startsWith('ca-')
    ? publisher_id.slice(3)
    : publisher_id

  const content = `google.com, ${normalizedPubId}, DIRECT, f08c47fec0942fa0\n`

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
