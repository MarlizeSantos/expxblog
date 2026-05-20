import { Header } from '@/components/layout/Header'
import { PortalHeader } from '@/components/layout/PortalHeader'
import { BusinessHeader } from '@/components/layout/BusinessHeader'
import { NewsHeader } from '@/components/layout/NewsHeader'
import { TechHeader } from '@/components/layout/TechHeader'
import { Footer } from '@/components/layout/Footer'
import { NewsletterSection } from '@/components/blog/NewsletterSection'
import { getSettings } from '@/lib/settings'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { company } = await getSettings()
  const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return {
    title: { default: blogName, template: `%s | ${blogName}` },
    alternates: { types: { 'application/rss+xml': `${baseUrl}/feed.xml` } },
  }
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { template, company, newsletter } = await getSettings()
  const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
  const logoUrl = company.logo_url

  return (
    <div className="min-h-screen flex flex-col">
      {template === 'portal'
        ? <PortalHeader blogName={blogName} logoUrl={logoUrl} />
        : template === 'business'
          ? <BusinessHeader blogName={blogName} logoUrl={logoUrl} />
          : template === 'news'
            ? <NewsHeader blogName={blogName} logoUrl={logoUrl} />
            : template === 'tech'
              ? <TechHeader blogName={blogName} logoUrl={logoUrl} />
              : <Header blogName={blogName} logoUrl={logoUrl} />
      }
      <main
        className={`flex-1 w-full mx-auto px-4 py-8 ${
          template === 'portal' || template === 'business' || template === 'news' || template === 'tech'
            ? 'max-w-7xl'
            : 'max-w-6xl'
        }`}
      >
        {children}
      </main>
      {newsletter.enabled && (
        <div className={`w-full mx-auto px-4 ${
          template === 'portal' || template === 'business' || template === 'news' || template === 'tech'
            ? 'max-w-7xl'
            : 'max-w-6xl'
        }`}>
          <NewsletterSection title={newsletter.title} subtitle={newsletter.subtitle} />
        </div>
      )}
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
    </div>
  )
}
