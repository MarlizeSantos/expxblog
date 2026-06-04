import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/app-url'
import { getSitemapEntries } from '@/lib/db-queries'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl()
  const { posts, categories, tags } = await getSitemapEntries()

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${appUrl}/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${appUrl}/categoria/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  const tagEntries: MetadataRoute.Sitemap = tags.map((t) => ({
    url: `${appUrl}/tag/${t.slug}`,
    changeFrequency: 'weekly',
    priority: 0.4,
  }))

  return [
    {
      url: appUrl,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...postEntries,
    ...categoryEntries,
    ...tagEntries,
  ]
}
