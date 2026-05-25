import Link from 'next/link'
import type { Post, Category } from '@/drizzle/schema'

interface HeroPostProps {
  post: Post & { categories: Category[] }
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date))
}

export function HeroPost({ post }: HeroPostProps) {
  return (
    <Link href={`/${post.slug}`} className="block group mb-8">
      <div className="relative w-full overflow-hidden rounded-xl bg-gray-800" style={{ minHeight: '320px', maxHeight: '480px', aspectRatio: '16/9' }}>
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          {post.categories.length > 0 && (
            <span
              className="inline-block text-white text-xs font-bold px-2.5 py-1 rounded mb-3 uppercase tracking-wide"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              {post.categories[0].name}
            </span>
          )}
          <h1 className="text-white text-2xl md:text-4xl font-bold leading-tight mb-2 group-hover:underline underline-offset-4 max-w-3xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-3 max-w-2xl">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center gap-3 text-white/60 text-sm">
            {post.published_at && <time>{formatDate(post.published_at)}</time>}
            <span
              className="text-white text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              Ler mais →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
