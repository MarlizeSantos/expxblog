import { Header } from '@/components/layout/Header'
import { PortalHeader } from '@/components/layout/PortalHeader'
import { BusinessHeader } from '@/components/layout/BusinessHeader'
import { NewsHeader } from '@/components/layout/NewsHeader'
import { TechHeader } from '@/components/layout/TechHeader'
import { MinimalHeader } from '@/components/layout/MinimalHeader'
import { MagazineHeader } from '@/components/layout/MagazineHeader'
import { DarkAuroraHeader } from '@/components/layout/DarkAuroraHeader'
import { EditorialHeader } from '@/components/layout/EditorialHeader'
import { SaasHeader } from '@/components/layout/SaasHeader'
import { LifestyleHeader } from '@/components/layout/LifestyleHeader'
import { BrutalistHeader } from '@/components/layout/BrutalistHeader'
import { Footer } from '@/components/layout/Footer'
import { TechFooter } from '@/components/layout/TechFooter'
import { MinimalFooter } from '@/components/layout/MinimalFooter'
import { MagazineFooter } from '@/components/layout/MagazineFooter'
import { DarkAuroraFooter } from '@/components/layout/DarkAuroraFooter'
import { EditorialFooter } from '@/components/layout/EditorialFooter'
import { SaasFooter } from '@/components/layout/SaasFooter'
import { LifestyleFooter } from '@/components/layout/LifestyleFooter'
import { BrutalistFooter } from '@/components/layout/BrutalistFooter'
import { NewsletterSection } from '@/components/blog/NewsletterSection'
import { getSettings } from '@/lib/settings'
import { getSeoSettings } from '@/lib/seo'
import { getAppUrl } from '@/lib/app-url'
import type { Metadata } from 'next'
import AdSenseScript from '@/components/blog/AdSenseScript'
import { CookieConsentBanner } from '@/components/blog/CookieConsentBanner'
import { FacebookPixel } from '@/components/blog/FacebookPixel'

// ISR: páginas públicas servidas de cache e regeneradas no máximo a cada 5 min.
// Sob carga, isso evita uma rodada de queries TCP ao Postgres por visita
// (o pool é max:1 por lambda — sem cache, requests entram em fila e dão timeout).
// Publicação/edição de post no admin dispara revalidatePath() para refletir na hora,
// então a janela longa não atrasa conteúdo novo.
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const [{ company }, seo] = await Promise.all([getSettings(), getSeoSettings()])
  const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
  const baseUrl = getAppUrl()
  return {
    title: { default: blogName, template: `%s | ${blogName}` },
    alternates: {
      types: {
        'application/rss+xml': `${baseUrl}/feed.xml`,
        'text/plain': `${baseUrl}/llms.txt`,
      },
    },
    verification: seo.google_site_verification
      ? { google: seo.google_site_verification }
      : undefined,
  }
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { template, company, newsletter, facebook_pixel } = await getSettings()
  const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
  const logoUrl = company.logo_url

  const wideTemplates = ['portal', 'business', 'news', 'tech', 'magazine', 'dark-aurora', 'saas', 'brutalist']
  const narrowTemplates = ['minimal']
  const mainWidth = wideTemplates.includes(template)
    ? 'max-w-7xl'
    : narrowTemplates.includes(template)
      ? 'max-w-4xl'
      : 'max-w-6xl'

  return (
    <div className="min-h-screen flex flex-col">
      <AdSenseScript />
      {template === 'portal'
        ? <PortalHeader blogName={blogName} logoUrl={logoUrl} />
        : template === 'business'
          ? <BusinessHeader blogName={blogName} logoUrl={logoUrl} />
          : template === 'news'
            ? <NewsHeader blogName={blogName} logoUrl={logoUrl} />
            : template === 'tech'
              ? <TechHeader blogName={blogName} logoUrl={logoUrl} />
              : template === 'minimal'
                ? <MinimalHeader blogName={blogName} logoUrl={logoUrl} />
                : template === 'magazine'
                  ? <MagazineHeader blogName={blogName} logoUrl={logoUrl} />
                  : template === 'dark-aurora'
                    ? <DarkAuroraHeader blogName={blogName} logoUrl={logoUrl} />
                    : template === 'editorial'
                      ? <EditorialHeader blogName={blogName} logoUrl={logoUrl} />
                      : template === 'saas'
                        ? <SaasHeader blogName={blogName} logoUrl={logoUrl} />
                        : template === 'lifestyle'
                          ? <LifestyleHeader blogName={blogName} logoUrl={logoUrl} />
                          : template === 'brutalist'
                            ? <BrutalistHeader blogName={blogName} logoUrl={logoUrl} />
                            : <Header blogName={blogName} logoUrl={logoUrl} />
      }
      <main className={`flex-1 w-full mx-auto px-4 py-8 ${mainWidth}`}>
        {children}
      </main>
      {newsletter.enabled && (
        <div className={`w-full mx-auto px-4 ${mainWidth}`}>
          <NewsletterSection title={newsletter.title} subtitle={newsletter.subtitle} facebookPixelConfig={facebook_pixel} />
        </div>
      )}
      {template === 'tech' ? (
        <TechFooter
          blogName={blogName}
          companyName={company.company_name}
          companyEmail={company.company_email}
          socialFacebook={company.social_facebook}
          socialInstagram={company.social_instagram}
          socialTwitter={company.social_twitter}
          socialYoutube={company.social_youtube}
        />
      ) : template === 'minimal' ? (
        <MinimalFooter
          blogName={blogName}
          companyName={company.company_name}
          companyEmail={company.company_email}
          socialFacebook={company.social_facebook}
          socialInstagram={company.social_instagram}
          socialTwitter={company.social_twitter}
          socialYoutube={company.social_youtube}
        />
      ) : template === 'magazine' ? (
        <MagazineFooter
          blogName={blogName}
          companyName={company.company_name}
          companyEmail={company.company_email}
          socialFacebook={company.social_facebook}
          socialInstagram={company.social_instagram}
          socialTwitter={company.social_twitter}
          socialYoutube={company.social_youtube}
        />
      ) : template === 'dark-aurora' ? (
        <DarkAuroraFooter
          blogName={blogName}
          companyName={company.company_name}
          companyEmail={company.company_email}
          socialFacebook={company.social_facebook}
          socialInstagram={company.social_instagram}
          socialTwitter={company.social_twitter}
          socialYoutube={company.social_youtube}
        />
      ) : template === 'editorial' ? (
        <EditorialFooter
          blogName={blogName}
          companyName={company.company_name}
          companyEmail={company.company_email}
          socialFacebook={company.social_facebook}
          socialInstagram={company.social_instagram}
          socialTwitter={company.social_twitter}
          socialYoutube={company.social_youtube}
        />
      ) : template === 'saas' ? (
        <SaasFooter
          blogName={blogName}
          companyName={company.company_name}
          companyEmail={company.company_email}
          socialFacebook={company.social_facebook}
          socialInstagram={company.social_instagram}
          socialTwitter={company.social_twitter}
          socialYoutube={company.social_youtube}
        />
      ) : template === 'lifestyle' ? (
        <LifestyleFooter
          blogName={blogName}
          companyName={company.company_name}
          companyEmail={company.company_email}
          socialFacebook={company.social_facebook}
          socialInstagram={company.social_instagram}
          socialTwitter={company.social_twitter}
          socialYoutube={company.social_youtube}
        />
      ) : template === 'brutalist' ? (
        <BrutalistFooter
          blogName={blogName}
          companyName={company.company_name}
          companyEmail={company.company_email}
          socialFacebook={company.social_facebook}
          socialInstagram={company.social_instagram}
          socialTwitter={company.social_twitter}
          socialYoutube={company.social_youtube}
        />
      ) : (
        <Footer
          blogName={blogName}
          companyName={company.company_name}
          companyEmail={company.company_email}
          companyPhone={company.company_phone}
          socialFacebook={company.social_facebook}
          socialInstagram={company.social_instagram}
          socialTwitter={company.social_twitter}
          socialYoutube={company.social_youtube}
        />
      )}
      <FacebookPixel config={facebook_pixel} />
      <CookieConsentBanner />
    </div>
  )
}
