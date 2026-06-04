import type { Metadata } from 'next'
import { getAdSenseConfig } from '@/lib/db-queries'
import { getSettings, getLgpdSettings } from '@/lib/settings'
import { getAppUrl } from '@/lib/app-url'

export async function generateMetadata(): Promise<Metadata> {
  const { company } = await getSettings()
  const lgpd = await getLgpdSettings()
  const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
  const baseUrl = getAppUrl()
  return {
    title: 'Política de Privacidade',
    description: `Saiba como ${blogName} coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.`,
    alternates: { canonical: `${baseUrl}/politica-de-privacidade` },
    robots: { index: true, follow: true },
  }
}

export default async function PoliticaDePrivacidadePage() {
  const { company } = await getSettings()
  const adsenseConfig = await getAdSenseConfig()
  const lgpd = await getLgpdSettings()
  const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
  const companyName = company.company_name || blogName
  const companyEmail = company.company_email || 'privacidade@seudominio.com'
  const dpoEmail = lgpd.dpo_email || companyEmail
  const dpoName = lgpd.dpo_name || ''
  const controllerName = lgpd.controller_name || companyName
  const baseUrl = getAppUrl()
  const today = new Date()
  const lastUpdated = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <article className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold text-neutral-900 mb-2">Política de Privacidade</h1>
      <p className="text-sm text-gray-500 mb-8">Última atualização: {lastUpdated}</p>

      <div className="prose prose-lg font-serif max-w-none text-neutral-900 space-y-8">

        <section>
          <h2 className="text-xl font-semibold font-sans">1. Quem somos</h2>
          <p>
            <strong>{controllerName}</strong> é responsável pelo blog <strong>{blogName}</strong>
            {' '}(acessível em <a href={baseUrl} className="text-brand-primary underline">{baseUrl}</a>).
            Esta Política de Privacidade descreve como coletamos, usamos e protegemos seus dados pessoais,
            em conformidade com a Lei Geral de Proteção de Dados (Lei n.º 13.709/2018 — LGPD).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold font-sans">2. Dados que coletamos e por quê</h2>

          <h3 className="text-base font-semibold font-sans mt-4">2.1 Analytics de navegação (page views)</h3>
          <p>
            Ao visitar páginas do blog, registramos: caminho da URL acessada, referenciador HTTP
            (de onde você veio), agente de usuário (tipo de navegador/SO) e um identificador
            técnico anonimizado. O identificador <strong>não é o endereço IP em texto claro</strong>;
            é um hash SHA-256 unidirecional derivado de IP + data + chave interna — impossível
            reverter ao IP original.
          </p>
          <ul>
            <li><strong>Finalidade:</strong> entender quais conteúdos são mais acessados para melhorar o blog.</li>
            <li><strong>Base legal:</strong> legítimo interesse (Art. 7º, IX, LGPD).</li>
            <li><strong>Retenção:</strong> 12 meses; após esse prazo os registros são excluídos automaticamente.</li>
          </ul>

          <h3 className="text-base font-semibold font-sans mt-4">2.2 Newsletter</h3>
          <p>
            Se você se inscrever na newsletter, coletamos seu endereço de e-mail e registramos
            a data/hora do consentimento e a versão do texto de consentimento aceito.
          </p>
          <ul>
            <li><strong>Finalidade:</strong> enviar artigos e atualizações do blog por e-mail.</li>
            <li><strong>Base legal:</strong> consentimento (Art. 7º, I, LGPD). Você pode revogar a qualquer momento pelo link de cancelamento em cada e-mail.</li>
            <li><strong>Retenção:</strong> enquanto a inscrição estiver ativa. Após cancelamento, o registro é excluído em 30 dias.</li>
          </ul>

          <h3 className="text-base font-semibold font-sans mt-4">2.3 Usuários administradores</h3>
          <p>
            Usuários com acesso ao painel administrativo têm nome, e-mail e senha armazenados.
            A senha é armazenada exclusivamente como hash bcrypt (salt 12) — nunca em texto claro.
          </p>
          <ul>
            <li><strong>Finalidade:</strong> autenticação e controle de acesso ao painel.</li>
            <li><strong>Base legal:</strong> execução de contrato ou obrigação legal (Art. 7º, II e V, LGPD).</li>
            <li><strong>Retenção:</strong> enquanto a conta estiver ativa.</li>
          </ul>

          <h3 className="text-base font-semibold font-sans mt-4">2.4 Logs de automação e IA</h3>
          <p>
            Registros técnicos de execução de automações e chamadas à API de Inteligência Artificial
            (tokens, custo, duração, status). Não contêm dados pessoais de visitantes.
          </p>
          <ul>
            <li><strong>Finalidade:</strong> monitoramento, depuração e controle de custos.</li>
            <li><strong>Base legal:</strong> legítimo interesse (Art. 7º, IX, LGPD).</li>
            <li><strong>Retenção:</strong> 6 meses.</li>
          </ul>

          {adsenseConfig.enabled && (
            <>
              <h3 className="text-base font-semibold font-sans mt-4">2.5 Publicidade (Google AdSense)</h3>
              <p>
                Este blog exibe anúncios por meio do serviço <strong>Google AdSense</strong>. O Google e seus
                parceiros podem usar cookies e tecnologias similares para personalizar os anúncios exibidos com base
                em visitas anteriores a este site e a outros sites na internet.
              </p>
              <ul>
                <li><strong>Finalidade:</strong> exibição de publicidade relevante para financiar o blog.</li>
                <li><strong>Base legal:</strong> consentimento e legítimo interesse (Art. 7º, I e IX, LGPD).</li>
                <li>
                  <strong>Opt-out:</strong> você pode desativar a personalização de anúncios acessando{' '}
                  <a
                    href="https://www.google.com/settings/ads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary underline"
                  >
                    Configurações de anúncios do Google
                  </a>
                  {' '}ou instalando o{' '}
                  <a
                    href="https://optout.aboutads.info/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary underline"
                  >
                    complemento de opt-out do Google Analytics
                  </a>.
                </li>
              </ul>
            </>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold font-sans">3. Compartilhamento e transferência internacional</h2>
          <p>Seus dados podem ser processados pelos seguintes suboperadores:</p>
          <ul>
            <li>
              <strong>Supabase</strong> (banco de dados PostgreSQL) — infraestrutura hospedada nos EUA/EU.
              Transferência internacional amparada por cláusulas contratuais padrão (Art. 33, V, LGPD).
            </li>
            {adsenseConfig.enabled && (
              <li>
                <strong>Google AdSense</strong> (plataforma de publicidade) — serviço do Google nos EUA/EU.
                O Google pode usar cookies e dados de navegação para personalizar anúncios.
                Transferência internacional amparada por cláusulas contratuais padrão (Art. 33, V, LGPD).
                Política do Google:{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-primary underline">
                  policies.google.com/privacy
                </a>.
              </li>
            )}
            <li>
              <strong>Resend</strong> (envio de e-mails de newsletter) — processador de e-mail nos EUA.
              Transferência internacional amparada por cláusulas contratuais padrão (Art. 33, V, LGPD).
              Seus dados de e-mail são transmitidos apenas quando você se inscreve na newsletter.
            </li>
            <li>
              <strong>OpenRouter</strong> (API de Inteligência Artificial) — serviço nos EUA para geração
              automática de conteúdo. Não recebe dados pessoais de visitantes — apenas texto de artigos.
              Transferência amparada por cláusulas contratuais padrão (Art. 33, V, LGPD).
            </li>
            <li>
              <strong>Vercel</strong> (hospedagem da aplicação) — plataforma nos EUA/EU.
              Dados transitam pelos servidores de borda da Vercel para entrega das páginas.
            </li>
            <li>
              <strong>Meta Platforms (Facebook Pixel)</strong> — tecnologia de rastreamento nos EUA/UE,
              condicionada ao consentimento do visitante. Ativada apenas se o administrador do site configurar
              o Facebook Pixel e o visitante aceitar o banner de cookies.
              Transferência internacional amparada por cláusulas contratuais padrão (Art. 33, V, LGPD).
            </li>
          </ul>
          <p>Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins de marketing.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold font-sans">4. Seus direitos como titular (Art. 18 LGPD)</h2>
          <p>Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
          <ul>
            <li><strong>Confirmação e acesso (Art. 18, I e II):</strong> saber se tratamos seus dados e obter uma cópia.</li>
            <li><strong>Correção (Art. 18, III):</strong> solicitar a correção de dados incompletos ou incorretos.</li>
            <li><strong>Anonimização, bloqueio ou eliminação (Art. 18, IV):</strong> de dados desnecessários ou tratados em desconformidade.</li>
            <li><strong>Portabilidade (Art. 18, V):</strong> exportar seus dados em formato estruturado.</li>
            <li><strong>Eliminação (Art. 18, VI):</strong> excluir dados tratados com base em consentimento.</li>
            <li><strong>Revogação do consentimento (Art. 18, IX):</strong> cancelar a inscrição na newsletter a qualquer momento pelo link nos e-mails ou pela rota <code>/api/newsletter/unsubscribe?token=SEU_TOKEN</code>.</li>
          </ul>
          <p>
            Para exercer qualquer direito acima, exceto cancelamento de newsletter (que é
            auto-serviço), entre em contato pelo e-mail do Encarregado indicado abaixo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold font-sans">5. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:
            criptografia TLS em trânsito, hash bcrypt para senhas, anonimização de IPs em analytics,
            autenticação JWT com expiração de 24h, e headers de segurança HTTP (HSTS, CSP, X-Frame-Options).
          </p>
          <p>
            Em caso de incidente de segurança que possa acarretar risco ou dano relevante a titulares,
            notificaremos a ANPD e os afetados nos prazos legais (Art. 48 LGPD).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold font-sans">6. Cookies e tecnologias similares</h2>
          <p>
            Utilizamos cookies estritamente necessários para autenticação de usuários
            administradores (cookie <code>auth-token</code>, HttpOnly, duração 24h).
          </p>
          {adsenseConfig.enabled ? (
            <p>
              Além disso, o serviço Google AdSense utiliza cookies de terceiros para exibir anúncios
              relevantes. O Google pode usar dados de navegação para personalizar anúncios. Para saber mais,
              consulte a{' '}
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary underline"
              >
                Política de privacidade de publicidade do Google
              </a>.
            </p>
          ) : (
            <p>Não utilizamos cookies de rastreamento, publicidade ou analytics de terceiros.</p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold font-sans">7. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta política periodicamente. Alterações significativas serão
            comunicadas por e-mail (se você for inscrito na newsletter) ou por aviso em destaque
            no site. A data da última atualização está indicada no topo desta página.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold font-sans">8. Encarregado de Proteção de Dados (DPO)</h2>
          <p>
            Para questões, solicitações ou reclamações relacionadas a privacidade e proteção de dados,
            entre em contato com nosso Encarregado:
          </p>
          {dpoName && (
            <p><strong>Nome:</strong> {dpoName}</p>
          )}
          <p>
            <strong>E-mail:</strong>{' '}
            <a href={`mailto:${dpoEmail}`} className="text-brand-primary underline">
              {dpoEmail}
            </a>
          </p>
          <p>
            Você também pode registrar reclamação diretamente na{' '}
            <a
              href="https://www.gov.br/anpd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary underline"
            >
              Autoridade Nacional de Proteção de Dados (ANPD)
            </a>
            .
          </p>
        </section>

      </div>
    </article>
  )
}
