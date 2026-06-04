import { db } from '@/drizzle/db'
import { posts, postCategories, categories, tags, postTags, siteSettings, articleThemes } from '@/drizzle/schema'
import { eq, and, asc, desc, count, inArray, sql } from 'drizzle-orm'

export async function getPostsPage(params: {
  page?: string | number
  limit?: string | number
  category?: string
  tag?: string
  search?: string
}) {
  try {
    const page = Math.max(1, parseInt(String(params.page ?? '1')) || 1)
    const limitNum = parseInt(String(params.limit ?? '10')) || 10
    if (limitNum <= 0) return { posts: [], total: 0, page, pages: 1 }
    const limit = Math.min(50, limitNum)
    const offset = (page - 1) * limit

    const conditions = [eq(posts.status, 'published')]

    if (params.search) {
      conditions.push(
        sql`(${posts.title} ILIKE ${'%' + params.search + '%'} OR ${posts.content} ILIKE ${'%' + params.search + '%'})`
      )
    }

    let postIds: number[] | undefined

    if (params.category) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, params.category))
        .limit(1)
      if (cat) {
        const rels = await db
          .select({ post_id: postCategories.post_id })
          .from(postCategories)
          .where(eq(postCategories.category_id, cat.id))
        postIds = rels.map((r) => r.post_id)
      } else {
        postIds = []
      }
    }

    if (params.tag) {
      const [t] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.slug, params.tag))
        .limit(1)
      if (t) {
        const tagRels = await db
          .select({ post_id: postTags.post_id })
          .from(postTags)
          .where(eq(postTags.tag_id, t.id))
        const tagPostIds = tagRels.map((r) => r.post_id)
        postIds = postIds ? postIds.filter((id) => tagPostIds.includes(id)) : tagPostIds
      } else {
        postIds = []
      }
    }

    if (postIds !== undefined) {
      if (postIds.length === 0) return { posts: [], total: 0, page, pages: 0 }
      conditions.push(inArray(posts.id, postIds))
    }

    const whereClause = and(...conditions)
    const [{ total }] = await db.select({ total: count() }).from(posts).where(whereClause)

    const postRows = await db
      .select()
      .from(posts)
      .where(whereClause)
      .orderBy(desc(posts.published_at))
      .limit(limit)
      .offset(offset)

    if (postRows.length === 0) {
      return { posts: [], total, page, pages: Math.ceil(total / limit) }
    }

    const ids = postRows.map((p) => p.id)

    const allPostCats = await db
      .select({ post_id: postCategories.post_id, category: categories })
      .from(postCategories)
      .innerJoin(categories, eq(postCategories.category_id, categories.id))
      .where(inArray(postCategories.post_id, ids))

    const allPostTags = await db
      .select({ post_id: postTags.post_id, tag: tags })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tag_id, tags.id))
      .where(inArray(postTags.post_id, ids))

    return {
      posts: postRows.map((post) => ({
        ...post,
        categories: allPostCats.filter((r) => r.post_id === post.id).map((r) => r.category),
        tags: allPostTags.filter((r) => r.post_id === post.id).map((r) => r.tag),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    }
  } catch {
    return { posts: [], total: 0, page: 1, pages: 1 }
  }
}

export async function getCategoryBySlug(slug: string) {
  try {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)
    return cat ?? null
  } catch {
    return null
  }
}

export async function getTagBySlug(slug: string) {
  try {
    const [tag] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1)
    return tag ?? null
  } catch {
    return null
  }
}

export async function getAllCategories() {
  try {
    return await db.select().from(categories).orderBy(asc(categories.name))
  } catch {
    return []
  }
}

export async function getOnboardingStatus(): Promise<{
  hasApiKey: boolean
  hasBriefing: boolean
  themesCount: number
  hasFirstArticle: boolean
}> {
  try {
    const [apiKeyRow, briefingRow, themesCountResult, postsCountResult] = await Promise.all([
      db.select({ value: siteSettings.value })
        .from(siteSettings)
        .where(eq(siteSettings.key, 'ai_api_key'))
        .limit(1),
      db.select({ value: siteSettings.value })
        .from(siteSettings)
        .where(eq(siteSettings.key, 'briefing_content'))
        .limit(1),
      db.select({ total: count() }).from(articleThemes),
      db.select({ total: count() }).from(posts),
    ])

    const hasApiKey = apiKeyRow.length > 0 && !!apiKeyRow[0].value?.trim()
    const hasBriefing = briefingRow.length > 0 && !!briefingRow[0].value?.trim()
    const themesCount = themesCountResult[0]?.total ?? 0
    const hasFirstArticle = (postsCountResult[0]?.total ?? 0) > 0

    return { hasApiKey, hasBriefing, themesCount, hasFirstArticle }
  } catch {
    return { hasApiKey: false, hasBriefing: false, themesCount: 0, hasFirstArticle: false }
  }
}

export async function getAdSenseConfig(): Promise<{ enabled: boolean; publisher_id: string }> {
  try {
    const rows = await db
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(
        sql`${siteSettings.key} IN ('adsense_enabled', 'adsense_publisher_id')`
      )
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return {
      enabled: map['adsense_enabled'] === 'true',
      publisher_id: map['adsense_publisher_id'] ?? '',
    }
  } catch {
    return { enabled: false, publisher_id: '' }
  }
}

export async function getSitemapEntries() {
  try {
    const [postRows, categoryRows, tagRows] = await Promise.all([
      db
        .select({ slug: posts.slug, updated_at: posts.updated_at })
        .from(posts)
        .where(eq(posts.status, 'published'))
        .orderBy(desc(posts.updated_at)),
      db.select({ slug: categories.slug }).from(categories).orderBy(asc(categories.name)),
      db.select({ slug: tags.slug }).from(tags).orderBy(asc(tags.name)),
    ])
    return { posts: postRows, categories: categoryRows, tags: tagRows }
  } catch {
    return { posts: [], categories: [], tags: [] }
  }
}

export async function getRelatedPosts(
  postId: number,
  categoryIds: number[],
  tagIds: number[],
  limit = 3
) {
  try {
    const seen = new Set<number>([postId])
    const result: { id: number; title: string; slug: string; excerpt: string; cover_image: string | null; published_at: Date | null }[] = []

    // 1. Mesma categoria
    if (categoryIds.length > 0 && result.length < limit) {
      const catPostIds = await db
        .select({ post_id: postCategories.post_id })
        .from(postCategories)
        .where(inArray(postCategories.category_id, categoryIds))
      const ids = catPostIds.map((r) => r.post_id).filter((id) => !seen.has(id))
      if (ids.length > 0) {
        const rows = await db
          .select({
            id: posts.id,
            title: posts.title,
            slug: posts.slug,
            excerpt: posts.excerpt,
            cover_image: posts.cover_image,
            published_at: posts.published_at,
          })
          .from(posts)
          .where(and(eq(posts.status, 'published'), inArray(posts.id, ids)))
          .orderBy(desc(posts.published_at))
          .limit(limit - result.length)
        rows.forEach((r) => { if (!seen.has(r.id)) { seen.add(r.id); result.push(r) } })
      }
    }

    // 2. Mesma tag
    if (tagIds.length > 0 && result.length < limit) {
      const tagPostIds = await db
        .select({ post_id: postTags.post_id })
        .from(postTags)
        .where(inArray(postTags.tag_id, tagIds))
      const ids = tagPostIds.map((r) => r.post_id).filter((id) => !seen.has(id))
      if (ids.length > 0) {
        const rows = await db
          .select({
            id: posts.id,
            title: posts.title,
            slug: posts.slug,
            excerpt: posts.excerpt,
            cover_image: posts.cover_image,
            published_at: posts.published_at,
          })
          .from(posts)
          .where(and(eq(posts.status, 'published'), inArray(posts.id, ids)))
          .orderBy(desc(posts.published_at))
          .limit(limit - result.length)
        rows.forEach((r) => { if (!seen.has(r.id)) { seen.add(r.id); result.push(r) } })
      }
    }

    // 3. Mais recentes do blog (fallback)
    if (result.length < limit) {
      const rows = await db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          excerpt: posts.excerpt,
          cover_image: posts.cover_image,
          published_at: posts.published_at,
        })
        .from(posts)
        .where(eq(posts.status, 'published'))
        .orderBy(desc(posts.published_at))
        .limit(limit * 2)
      rows.forEach((r) => { if (!seen.has(r.id)) { seen.add(r.id); result.push(r) } })
    }

    return result.slice(0, limit)
  } catch {
    return []
  }
}
