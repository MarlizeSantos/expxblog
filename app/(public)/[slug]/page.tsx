import { notFound } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import { PostViewTracker } from '@/components/blog/PostViewTracker'
import { ArticleJsonLd } from '@/components/blog/ArticleJsonLd'
import { RelatedPosts } from '@/components/blog/RelatedPosts'
import { ShareButtons } from '@/components/blog/ShareButtons'
import { getRelatedPosts } from '@/lib/db-queries'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/Badge'
import { getAppUrl } from '@/lib/app-url'
import { db } from '@/drizzle/db'
import { posts, categories, tags, postCategories, postTags } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

async function getPost(slug: string) {
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, 'published')))
    .limit(1)

  if (!post) return null

  const postCats = await db
    .select({ category: categories })
    .from(postCategories)
    .innerJoin(categories, eq(postCategories.category_id, categories.id))
    .where(eq(postCategories.post_id, post.id))

  const postTagsList = await db
    .select({ tag: tags })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tag_id, tags.id))
    .where(eq(postTags.post_id, post.id))

  return {
    ...post,
    categories: postCats.map((r) => r.category),
    tags: postTagsList.map((r) => r.tag),
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: 'Artigo não encontrado' }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `${getAppUrl()}/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.cover_image ? [{ url: post.cover_image }] : [],
      type: 'article',
    },
  }
}

function formatDate(date: Date | null) {
  if (!date) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const [post, settings] = await Promise.all([
    getPost(params.slug),
    getSettings(),
  ])
  if (!post) notFound()

  const { facebook_pixel, company } = settings
  const blogName = company.blog_name || 'Blog'
  const authorName = post.author_name || blogName
  const canonicalUrl = `${getAppUrl()}/${post.slug}`

  const categoryIds = post.categories?.map((c: { id: number }) => c.id) ?? []
  const tagIds = post.tags?.map((t: { id: number }) => t.id) ?? []
  const firstCategory = post.categories?.[0]?.name

  const relatedPosts = await getRelatedPosts(post.id, categoryIds, tagIds, 3)

  return (
    <article className="w-full">
      <ArticleJsonLd
        title={post.title}
        description={post.excerpt}
        imageUrl={post.cover_image}
        datePublished={post.published_at}
        dateModified={post.updated_at}
        authorName={authorName}
        publisherName={blogName}
        publisherLogoUrl={company.logo_url || undefined}
        canonicalUrl={canonicalUrl}
      />

      <PostViewTracker
        config={facebook_pixel}
        contentName={post.title}
        contentCategory={firstCategory}
      />
      <Link href="/" className="text-brand-primary text-sm hover:underline mb-6 inline-block">
        ← Voltar ao Blog
      </Link>

      {post.cover_image && (
        <div className="relative aspect-video rounded-xl overflow-hidden mb-8">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      )}

      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          {post.categories?.map((cat: { id: number; name: string; slug: string }) => (
            <Link key={cat.id} href={`/categoria/${cat.slug}`}>
              <Badge variant="category">{cat.name}</Badge>
            </Link>
          ))}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold font-serif text-neutral-900 leading-tight mb-3">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          {post.published_at && <time>{formatDate(post.published_at)}</time>}
          <span>Por {authorName}</span>
          {post.tags?.map((tag: { id: number; name: string; slug: string }) => (
            <Link key={tag.id} href={`/tag/${tag.slug}`}>
              <Badge variant="tag">{tag.name}</Badge>
            </Link>
          ))}
        </div>
      </header>

      <ShareButtons url={canonicalUrl} title={post.title} />

      <div
        className="prose max-w-none mt-8"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <ShareButtons url={canonicalUrl} title={post.title} />

      <RelatedPosts posts={relatedPosts} />
    </article>
  )
}
