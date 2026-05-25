import { PostCardPortal } from './PostCardPortal'
import type { Post, Category } from '@/drizzle/schema'

interface EditorialGridProps {
  posts: (Post & { categories: Category[] })[]
}

export function EditorialGrid({ posts }: EditorialGridProps) {
  if (posts.length === 0) return null

  const leads = posts.slice(0, 3)
  const grid = posts.slice(3)

  return (
    <div>
      {leads.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8 mb-8 border-b border-gray-100">
          {leads.map((post) => (
            <PostCardPortal key={post.id} post={post} size="lead" />
          ))}
        </div>
      )}

      {grid.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-5 rounded-sm" style={{ backgroundColor: 'var(--color-secondary)' }} />
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>
              Mais artigos
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {grid.map((post) => (
              <PostCardPortal key={post.id} post={post} size="grid" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
