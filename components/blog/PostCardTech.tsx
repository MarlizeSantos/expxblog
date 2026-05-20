import Link from 'next/link'
import { estimateReadingTime } from '@/lib/reading-time'

interface Post {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  published_at: string | null
  categories: { id: number; name: string; slug: string }[]
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  post: Post
  variant?: 'card' | 'featured' | 'secondary'
}

export function PostCardTech({ post, variant = 'card' }: Props) {
  const readTime = estimateReadingTime(post.content)
  const firstCategory = post.categories[0]

  if (variant === 'featured') {
    return (
      <Link href={`/${post.slug}`} className="group block relative rounded-xl overflow-hidden bg-gray-900 h-full">
        <div className="aspect-[16/9] w-full overflow-hidden">
          {post.cover_image ? (
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
            />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: 'var(--color-primary)' }} />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {firstCategory && (
            <span
              className="inline-block text-white text-xs font-bold px-2 py-0.5 rounded mb-2 uppercase tracking-wide"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              {firstCategory.name}
            </span>
          )}
          <h2 className="text-white text-xl font-bold leading-snug line-clamp-3 group-hover:underline underline-offset-2">
            {post.title}
          </h2>
          <p className="text-white/60 text-xs mt-2">
            {formatDate(post.published_at)}{readTime ? ` · ${readTime} min` : ''}
          </p>
        </div>
      </Link>
    )
  }

  if (variant === 'secondary') {
    return (
      <Link href={`/${post.slug}`} className="group flex gap-3 bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-sm transition-shadow">
        <div className="w-24 shrink-0 overflow-hidden">
          {post.cover_image ? (
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-100" style={{ minHeight: '72px' }} />
          )}
        </div>
        <div className="py-2.5 pr-3 flex flex-col justify-center min-w-0">
          {firstCategory && (
            <span
              className="text-xs font-bold uppercase tracking-wider mb-1 block truncate"
              style={{ color: 'var(--color-secondary)' }}
            >
              {firstCategory.name}
            </span>
          )}
          <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:opacity-70">
            {post.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{formatDate(post.published_at)}</p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/${post.slug}`}
      className="group bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow block border border-gray-100"
    >
      <div className="aspect-[16/9] overflow-hidden">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
      </div>
      <div className="p-4">
        {firstCategory && (
          <span
            className="text-xs font-bold uppercase tracking-wider mb-2 block"
            style={{ color: 'var(--color-secondary)' }}
          >
            {firstCategory.name}
          </span>
        )}
        <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:opacity-70">
          {post.title}
        </h3>
        <p className="text-xs text-gray-400 mt-2">
          {formatDate(post.published_at)}{readTime ? ` · ${readTime} min` : ''}
        </p>
      </div>
    </Link>
  )
}
