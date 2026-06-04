interface ArticleJsonLdProps {
  title: string
  description: string
  imageUrl?: string | null
  datePublished?: Date | null
  dateModified?: Date | null
  authorName: string
  publisherName: string
  publisherLogoUrl?: string
  canonicalUrl: string
}

export function ArticleJsonLd({
  title,
  description,
  imageUrl,
  datePublished,
  dateModified,
  authorName,
  publisherName,
  publisherLogoUrl,
  canonicalUrl,
}: ArticleJsonLdProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description || '',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      ...(publisherLogoUrl
        ? {
            logo: {
              '@type': 'ImageObject',
              url: publisherLogoUrl,
            },
          }
        : {}),
    },
  }

  if (imageUrl) schema.image = imageUrl
  if (datePublished) schema.datePublished = datePublished.toISOString()
  if (dateModified) schema.dateModified = dateModified.toISOString()

  // Escapa < para prevenir quebra acidental de tag
  const json = JSON.stringify(schema).replace(/</g, '\\u003c')

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
