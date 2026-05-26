import { PostCardNews } from '@/components/blog/PostCardNews'
import { db } from '@/drizzle/db'
import { posts, postCategories, categories } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'

async function getRecentPosts() {
  try {
    const recent = await db
      .select()
      .from(posts)
      .where(eq(posts.status, 'published'))
      .orderBy(desc(posts.published_at))
      .limit(5)

    return Promise.all(
      recent.map(async (p) => {
        const catRows = await db
          .select({ category: categories })
          .from(postCategories)
          .innerJoin(categories, eq(categories.id, postCategories.category_id))
          .where(eq(postCategories.post_id, p.id))
          .limit(1)
        return {
          ...p,
          published_at: p.published_at?.toISOString() ?? null,
          categories: catRows.map((r) => r.category),
        }
      })
    )
  } catch {
    return []
  }
}

export async function NewsSidebar() {
  const recentPosts = await getRecentPosts()

  return (
    <aside className="space-y-8">
      {recentPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2" style={{ borderColor: 'var(--color-secondary)' }}>
            <div
              className="h-4 w-[3px] rounded-sm"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            />
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-widest">
              Destaques
            </h2>
          </div>
          <div className="space-y-1">
            {recentPosts.map((post, i) => (
              <PostCardNews key={post.id} post={post} variant="mini" rank={i + 1} />
            ))}
          </div>
        </div>
      )}

    </aside>
  )
}
