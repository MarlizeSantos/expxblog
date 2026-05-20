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
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

interface Props {
  post: Post
  variant?: 'card' | 'mini'
  rank?: number
}

export function PostCardNews({ post, variant = 'card', rank }: Props) {
  const readTime = estimateReadingTime(post.content)
  const firstCategory = post.categories[0]

  if (variant === 'mini') {
    return (
      <Link
        href={`/${post.slug}`}
        className="group flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-1 rounded"
      >
        {rank !== undefined && (
          <span
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {rank}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug group-hover:opacity-70">
            {post.title}
          </h4>
          <p className="text-xs text-gray-400 mt-1">{formatDate(post.published_at)}</p>
        </div>
        {post.cover_image && (
          <img src={post.cover_image} alt="" className="w-16 h-11 object-cover rounded shrink-0" />
        )}
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
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>
      <div className="p-3">
        {firstCategory && (
          <span
            className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
            style={{ color: 'var(--color-secondary)' }}
          >
            {firstCategory.name}
          </span>
        )}
        <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:opacity-70">
          {post.title}
        </h3>
        <p className="text-xs text-gray-400 mt-2">
          {formatDate(post.published_at)} · {readTime} min
        </p>
      </div>
    </Link>
  )
}
