import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PostGrid } from '@/components/blog/PostGrid'
import { CategoryFilter } from '@/components/blog/CategoryFilter'
import { HeroPost } from '@/components/blog/HeroPost'
import { EditorialGrid } from '@/components/blog/EditorialGrid'
import { Pagination } from '@/components/ui/Pagination'
import { getSettings } from '@/lib/settings'
import { FeaturedSection } from '@/components/blog/FeaturedSection'
import { PostCardBusiness } from '@/components/blog/PostCardBusiness'
import { CategorySection } from '@/components/blog/CategorySection'
import { NewsSidebar } from '@/components/blog/NewsSidebar'
import { TechHero } from '@/components/blog/TechHero'
import { PostCardTech } from '@/components/blog/PostCardTech'
import { db } from '@/drizzle/db'
import { posts, postCategories, categories } from '@/drizzle/schema'
import { eq, desc, and, asc } from 'drizzle-orm'

export async function generateMetadata(): Promise<Metadata> {
  const { company } = await getSettings()
  const blogName = company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'
  return {
    title: 'Home',
    description: `${company.blog_description || 'Tecnologia, gestão e inovação para empresas'} — ${blogName}`,
  }
}

async function getPosts(searchParams: Record<string, string>) {
  const params = new URLSearchParams(searchParams)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/posts?${params.toString()}`,
    { cache: 'no-store' }
  )
  if (!res.ok) return { posts: [], total: 0, page: 1, pages: 1 }
  return res.json()
}

async function getCategories() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/categories`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) return { categories: [] }
  return res.json()
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: { page?: string; category?: string; tag?: string }
}) {
  const { template } = await getSettings()

  const pageLimit =
    template === 'portal' ? '10' :
    template === 'business' ? '12' :
    template === 'news' ? '0' :
    template === 'tech' ? '0' :
    '9'
  const [postsData, categoriesData] = await Promise.all([
    getPosts({ page: searchParams.page ?? '1', limit: pageLimit, ...searchParams }),
    getCategories(),
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
    const sections = await getNewsSections()
    return (
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
              {rest.map((post: { id: number; title: string; slug: string; content: string; excerpt: string; cover_image: string | null; published_at: string | null; categories: { id: number; name: string; slug: string }[] }) => (
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
    const sections = await getNewsSections()
    const heroPosts = sections.flatMap((s) => s.posts).slice(0, 3)
    const heroIds = new Set(heroPosts.map((p) => p.id))
    return (
      <div>
        <TechHero posts={heroPosts} />
        {sections.length === 0 && (
          <p className="text-gray-500">Nenhum post publicado ainda.</p>
        )}
        {sections.map(({ category, posts: sectionPosts }) => {
          const filtered = sectionPosts.filter((p) => !heroIds.has(p.id))
          if (filtered.length === 0) return null
          return (
            <section key={category.id} className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-5 rounded-full"
                    style={{ backgroundColor: 'var(--color-secondary)' }}
                  />
                  <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">
                    {category.name}
                  </h2>
                </div>
                <a
                  href={`/categoria/${category.slug}`}
                  className="text-xs font-semibold uppercase tracking-wide transition-opacity hover:opacity-60"
                  style={{ color: 'var(--color-secondary)' }}
                >
                  Ver mais →
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((post) => (
                  <PostCardTech key={post.id} post={post} variant="card" />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
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

      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-8">
          <h2 className="font-semibold text-neutral-900 mb-4">Categorias</h2>
          <div className="flex flex-col gap-1">
            {categoriesData.categories.map((cat: { id: number; name: string; slug: string }) => (
              <a
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="text-sm text-brand-primary hover:text-brand-primary-dark px-3 py-1.5 rounded-lg hover:bg-brand-primary-light transition-colors"
              >
                {cat.name}
              </a>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
