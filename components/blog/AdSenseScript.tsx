import { getAdSenseConfig } from '@/lib/db-queries'
import { AdSenseClient } from '@/components/blog/AdSenseClient'

/**
 * Server Component que resolve a configuração do Google AdSense no banco
 * (padrão de páginas públicas) e delega a injeção do script ao AdSenseClient,
 * que só carrega o script após o consentimento de cookies (LGPD).
 * Retorna null quando AdSense está desabilitado ou publisher_id está ausente/inválido.
 */
export default async function AdSenseScript() {
  const { enabled, publisher_id } = await getAdSenseConfig()

  const publisherIdRegex = /^ca-pub-\d{10,}$/
  if (!enabled || !publisher_id || !publisherIdRegex.test(publisher_id)) {
    return null
  }

  return <AdSenseClient publisherId={publisher_id} />
}
