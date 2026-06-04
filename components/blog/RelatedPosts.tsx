import Link from 'next/link'
import Image from 'next/image'

interface RelatedPost {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_image: string | null
  published_at: Date | null
}

interface RelatedPostsProps {
  posts: RelatedPost[]
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (!posts || posts.length === 0) return null

  return (
    <section className="mt-12 pt-10 border-t border-gray-200">
      <h2 className="text-xl font-bold font-serif text-neutral-900 mb-6">
        Artigos relacionados
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map((post) => (
          <article
            key={post.id}
            className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
          >
            <Link href={`/${post.slug}`} className="block">
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                {post.cover_image ? (
                  <Image
                    src={post.cover_image}
                    alt={post.title}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl opacity-20">📰</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="p-4">
              <Link href={`/${post.slug}`}>
                <h3 className="font-semibold text-neutral-900 leading-snug hover:text-brand-primary transition-colors line-clamp-2 mb-2 text-sm">
                  {post.title}
                </h3>
              </Link>
              {post.excerpt && (
                <p className="text-gray-500 text-xs line-clamp-2 mb-2">{post.excerpt}</p>
              )}
              {post.published_at && (
                <time className="text-xs text-gray-400">{formatDate(post.published_at)}</time>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
