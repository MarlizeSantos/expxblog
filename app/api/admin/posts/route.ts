import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import sanitizeHtml from 'sanitize-html'
import { db } from '@/drizzle/db'
import { posts, postCategories, postTags } from '@/drizzle/schema'
import { eq, count, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
import { generateSlug } from '@/lib/slug'
import { revalidatePublicPosts } from '@/lib/revalidate'
import { dispatchWebhookEvent } from '@/lib/webhooks'
import { triggerNewsletterSend } from '@/lib/newsletter-trigger'

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h2', 'h3', 'img']),
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] },
}

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['draft', 'published', 'all']).default('all'),
})

const createSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  slug: z.string().optional(),
  content: z.string().default(''),
  excerpt: z.string().default(''),
  cover_image: z.string().url().or(z.string().startsWith('/uploads/')).optional().nullable(),
  status: z.enum(['draft', 'published']).default('draft'),
  author_name: z.string().max(255).optional().nullable(),
  category_ids: z.array(z.number().int().positive()).optional(),
  tag_ids: z.array(z.number().int().positive()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const parsed = listSchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const { page, limit, status } = parsed.data
    const offset = (page - 1) * limit

    const where = status !== 'all' ? eq(posts.status, status) : undefined

    const [{ total }] = await db.select({ total: count() }).from(posts).where(where)

    const rows = await db
      .select()
      .from(posts)
      .where(where)
      .orderBy(sql`${posts.created_at} DESC`)
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ posts: rows, total })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { category_ids, tag_ids, slug: rawSlug, content, ...postData } = parsed.data
    const slug = rawSlug || generateSlug(postData.title)
    const cleanContent = sanitizeHtml(content, sanitizeOptions)

    const now = new Date()
    const [post] = await db
      .insert(posts)
      .values({
        ...postData,
        content: cleanContent,
        slug,
        published_at: postData.status === 'published' ? now : null,
        updated_at: now,
      })
      .returning()

    if (category_ids?.length) {
      await db.insert(postCategories).values(
        category_ids.map((category_id) => ({ post_id: post.id, category_id }))
      )
    }

    if (tag_ids?.length) {
      await db.insert(postTags).values(
        tag_ids.map((tag_id) => ({ post_id: post.id, tag_id }))
      )
    }

    if (post.status === 'published') {
      revalidatePublicPosts(post.slug)
      dispatchWebhookEvent('post_published', { post_id: post.id, title: post.title, slug: post.slug, status: post.status })
      triggerNewsletterSend(post.id)
    } else {
      dispatchWebhookEvent('post_draft_created', { post_id: post.id, title: post.title, slug: post.slug, status: post.status })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Slug já existe. Use outro slug.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
