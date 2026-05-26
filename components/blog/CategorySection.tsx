import Link from 'next/link'
import { PostCardNews } from '@/components/blog/PostCardNews'

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

interface Category {
  id: number
  name: string
  slug: string
}

interface Props {
  category: Category
  posts: Post[]
}

export function CategorySection({ category, posts }: Props) {
  if (posts.length === 0) return null

  const [lead, ...rest] = posts

  return (
    <section id={category.slug} className="mb-10 pb-10 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-[3px] rounded-sm"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-widest">
            {category.name}
          </h2>
        </div>
        <Link
          href={`/categoria/${category.slug}`}
          className="text-xs font-semibold uppercase tracking-wide transition-opacity hover:opacity-60"
          style={{ color: 'var(--color-primary)' }}
        >
          Ver mais →
        </Link>
      </div>

      {posts.length === 1 && (
        <PostCardNews post={lead} variant="horizontal" />
      )}

      {posts.length === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {posts.map((post) => (
            <PostCardNews key={post.id} post={post} variant="lead" />
          ))}
        </div>
      )}

      {posts.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <PostCardNews post={lead} variant="lead" />
          </div>
          <div className="flex flex-col gap-5">
            {rest.map((post) => (
              <PostCardNews key={post.id} post={post} variant="card" />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
