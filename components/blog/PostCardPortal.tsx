import Link from 'next/link'
import type { Post, Category } from '@/drizzle/schema'

interface PostCardPortalProps {
  post: Post & { categories: Category[] }
  size?: 'lead' | 'grid'
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function PostCardPortal({ post, size = 'grid' }: PostCardPortalProps) {
  const category = post.categories[0]

  if (size === 'lead') {
    return (
      <article className="group">
        <Link href={`/${post.slug}`} className="block">
          <div
            className="relative aspect-[16/9] overflow-hidden rounded-lg mb-3"
            style={{ borderTop: '3px solid var(--color-secondary)' }}
          >
            {post.cover_image ? (
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: 'var(--color-primary)', opacity: 0.15 }} />
            )}
          </div>
          <div>
            {category && (
              <span
                className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
                style={{ color: 'var(--color-secondary)' }}
              >
                {category.name}
              </span>
            )}
            <h3
              className="text-base font-bold leading-snug line-clamp-2 group-hover:underline underline-offset-2 mb-2"
              style={{ color: 'var(--color-primary)' }}
            >
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-2">{post.excerpt}</p>
            )}
            {post.published_at && (
              <time className="text-xs text-gray-400">{formatDate(post.published_at)}</time>
            )}
          </div>
        </Link>
      </article>
    )
  }

  return (
    <article className="group bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
      <Link href={`/${post.slug}`} className="block">
        {post.cover_image && (
          <div className="aspect-[16/9] overflow-hidden">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="p-4" style={{ borderTop: '3px solid var(--color-secondary)' }}>
          {category && (
            <span
              className="text-xs font-bold uppercase tracking-wider mb-2 block"
              style={{ color: 'var(--color-secondary)' }}
            >
              {category.name}
            </span>
          )}
          <h3
            className="text-sm font-bold leading-snug line-clamp-2 group-hover:underline underline-offset-2 mb-2"
            style={{ color: 'var(--color-primary)' }}
          >
            {post.title}
          </h3>
          {post.published_at && (
            <time className="text-xs text-gray-400">{formatDate(post.published_at)}</time>
          )}
        </div>
      </Link>
    </article>
  )
}
