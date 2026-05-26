import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PostGrid } from '@/components/blog/PostGrid'
import { CategoryFilter } from '@/components/blog/CategoryFilter'
import { HeroPost } from '@/components/blog/HeroPost'
import { EditorialGrid } from '@/components/blog/EditorialGrid'
import { Pagination } from '@/components/ui/Pagination'
import { getSettings } from '@/lib/settings'
import { getPostsPage, getAllCategories } from '@/lib/db-queries'
import { FeaturedSection } from '@/components/blog/FeaturedSection'
import { PostCardBusiness } from '@/components/blog/PostCardBusiness'
import { CategorySection } from '@/components/blog/CategorySection'
import { NewsSidebar } from '@/components/blog/NewsSidebar'
import { TechHero } from '@/components/blog/TechHero'
import { PostCardTech } from '@/components/blog/PostCardTech'
import { db } from '@/drizzle/db'
import { posts, postCategories, categories, tags } from '@/drizzle/schema'
import { eq, desc, and, asc } from 'drizzle-orm'

export async function generateMetadata(): Promise<Metadata> {
  const { company } = await getSettings()
  const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
  return {
    title: 'Home',
    description: `${company.blog_description || 'Tecnologia, gestão e inovação para empresas'} — ${blogName}`,
  }
}


type NewsPost = {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  published_at: string | null
  categories: { id: number; name: string; slug: string }[]
}

async function getNewsSections(): Promise<
  { category: { id: number; name: string; slug: string }; posts: NewsPost[] }[]
> {
  try {
    const cats = await db.select().from(categories).orderBy(asc(categories.name))
    const sections = await Promise.all(
      cats.map(async (cat) => {
        const rows = await db
          .select({ post: posts })
          .from(posts)
          .innerJoin(postCategories, eq(postCategories.post_id, posts.id))
          .where(
            and(
              eq(posts.status, 'published'),
              eq(postCategories.category_id, cat.id)
            )
          )
          .orderBy(desc(posts.published_at))
          .limit(3)

        const postsWithCats = await Promise.all(
          rows.map(async ({ post: p }) => {
            const catRows = await db
              .select({ category: categories })
              .from(postCategories)
              .innerJoin(categories, eq(categories.id, postCategories.category_id))
              .where(eq(postCategories.post_id, p.id))
              .limit(3)
            return {
              ...p,
              published_at: p.published_at?.toISOString() ?? null,
              categories: catRows.map((r) => r.category),
            }
          })
        )
        return { category: cat, posts: postsWithCats }
      })
    )
    return sections.filter((s) => s.posts.length > 0)
  } catch {
    return []
  }
}

async function getTechHeroPosts(): Promise<NewsPost[]> {
  try {
    const rows = await db
      .select({ post: posts })
      .from(posts)
      .where(eq(posts.status, 'published'))
      .orderBy(desc(posts.published_at))
      .limit(3)

    return Promise.all(
      rows.map(async ({ post: p }) => {
        const catRows = await db
          .select({ category: categories })
          .from(postCategories)
          .innerJoin(categories, eq(categories.id, postCategories.category_id))
          .where(eq(postCategories.post_id, p.id))
          .limit(3)
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; tag?: string }
}) {
  const { template } = await getSettings()

  const pageLimit =
    template === 'portal' ? '13' :
    template === 'business' ? '12' :
    template === 'news' ? '0' :
    template === 'tech' ? '10' :
    '9'
  const [postsData, categoriesData] = await Promise.all([
    getPostsPage({ page: searchParams.page, limit: pageLimit, category: searchParams.category, tag: searchParams.tag }),
    getAllCategories().then((cats) => ({ categories: cats })),
  ])

  if (template === 'portal') {
    const [heroPost, ...gridPosts] = postsData.posts
    return (
      <div>
        {heroPost && <HeroPost post={heroPost} />}
        <EditorialGrid posts={gridPosts} />
        <Suspense>
          <Pagination currentPage={postsData.page} totalPages={postsData.pages} />
        </Suspense>
      </div>
    )
  }

  if (template === 'news') {
    const [sections, allTags] = await Promise.all([
      getNewsSections(),
      db.select().from(tags).limit(20).catch(() => [] as typeof tags.$inferSelect[]),
    ])
    return (
      <div>
        {(sections.length > 0 || allTags.length > 0) && (
          <div className="mb-8 pb-6 border-b border-gray-100 space-y-3">
            {sections.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sections.map(({ category }) => (
                  <a
                    key={category.id}
                    href={`#${category.slug}`}
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full border transition-colors hover:bg-[var(--color-primary)] hover:text-white"
                    style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                  >
                    {category.name}
                  </a>
                ))}
              </div>
            )}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <a
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {tag.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            {sections.length === 0 && (
              <p className="text-gray-500">Nenhum post publicado ainda.</p>
            )}
            {sections.map(({ category, posts: sectionPosts }) => (
              <CategorySection key={category.id} category={category} posts={sectionPosts} />
            ))}
          </div>
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24">
              <NewsSidebar />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (template === 'business') {
    const [p1, p2, p3, p4, ...rest] = postsData.posts
    const featuredPosts = [p1, p2, p3, p4].filter(Boolean)
    return (
      <div>
        <FeaturedSection posts={featuredPosts} />
        {rest.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg font-bold text-neutral-900 whitespace-nowrap">Artigos Recentes</h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((post: { id: number; title: string; slug: string; content: string; excerpt: string; cover_image: string | null; published_at: Date | null; categories: { id: number; name: string; slug: string }[] }) => (
                <PostCardBusiness key={post.id} post={post} variant="grid" />
              ))}
            </div>
          </div>
        )}
        <Suspense>
          <Pagination currentPage={postsData.page} totalPages={postsData.pages} />
        </Suspense>
      </div>
    )
  }

  if (template === 'tech') {
    const heroPosts = await getTechHeroPosts()
    const listPosts = postsData.posts.map((p) => ({
      ...p,
      published_at: p.published_at?.toISOString() ?? null,
    }))
    return (
      <div>
        <TechHero posts={heroPosts} />
        {listPosts.length === 0 && (
          <p className="text-gray-500 mt-8">Nenhum post publicado ainda.</p>
        )}
        {listPosts.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-1 h-6 rounded-full"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              />
              <h2 className="text-base font-bold text-neutral-900 uppercase tracking-widest">
                Últimos artigos
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {listPosts.map((post) => (
                <PostCardTech key={post.id} post={post} variant="highlight" />
              ))}
            </div>
            <Suspense>
              <Pagination currentPage={postsData.page} totalPages={postsData.pages} />
            </Suspense>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-neutral-900 mb-2 font-serif">Blog</h1>
      <p className="text-gray-500 mb-8">Tecnologia, gestão e inovação para empresas</p>

      <Suspense>
        <CategoryFilter
          categories={categoriesData.categories}
          selected={searchParams.category}
        />
      </Suspense>

      <div className="mt-6">
        <PostGrid posts={postsData.posts} />
      </div>

      <Suspense>
        <Pagination currentPage={postsData.page} totalPages={postsData.pages} />
      </Suspense>
    </div>
  )
}
