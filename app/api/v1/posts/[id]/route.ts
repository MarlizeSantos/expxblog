import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import sanitizeHtml from 'sanitize-html'
import { db } from '@/drizzle/db'
import { posts, postCategories, postTags, categories, tags } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { verifyApiToken } from '@/lib/api-auth'
import { revalidatePublicPosts } from '@/lib/revalidate'

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h2', 'h3', 'img']),
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] },
}

function parseId(id: string): number | null {
  const n = parseInt(id, 10)
  return isNaN(n) || n <= 0 ? null : n
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiToken(request)
  if (!auth.valid) return auth.response

  try {
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
    if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })

    const postCats = await db
      .select({ category: categories })
      .from(postCategories)
      .innerJoin(categories, eq(postCategories.category_id, categories.id))
      .where(eq(postCategories.post_id, id))

    const postTagsList = await db
      .select({ tag: tags })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tag_id, tags.id))
      .where(eq(postTags.post_id, id))

    return NextResponse.json({
      post: {
        ...post,
        categories: postCats.map((r) => r.category),
        tags: postTagsList.map((r) => r.tag),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  cover_image: z.string().url().or(z.string().startsWith('/uploads/')).optional().nullable(),
  status: z.enum(['draft', 'published']).optional(),
  category_ids: z.array(z.number().int().positive()).optional(),
  tag_ids: z.array(z.number().int().positive()).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiToken(request)
  if (!auth.valid) return auth.response

  try {
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { category_ids, tag_ids, content, ...postData } = parsed.data
    const cleanContent = content !== undefined ? sanitizeHtml(content, sanitizeOptions) : undefined

    const existing = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
    if (!existing.length) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    const now = new Date()
    const updateData: Partial<typeof posts.$inferInsert> = {
      ...postData,
      ...(cleanContent !== undefined && { content: cleanContent }),
      updated_at: now,
    }

    if (postData.status === 'published' && !existing[0].published_at) {
      updateData.published_at = now
    }

    const [updated] = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, id))
      .returning()

    if (category_ids !== undefined) {
      await db.delete(postCategories).where(eq(postCategories.post_id, id))
      if (category_ids.length > 0) {
        await db.insert(postCategories).values(
          category_ids.map((category_id) => ({ post_id: id, category_id }))
        )
      }
    }

    if (tag_ids !== undefined) {
      await db.delete(postTags).where(eq(postTags.post_id, id))
      if (tag_ids.length > 0) {
        await db.insert(postTags).values(
          tag_ids.map((tag_id) => ({ post_id: id, tag_id }))
        )
      }
    }

    if (existing[0].slug !== updated.slug) revalidatePublicPosts(existing[0].slug)
    revalidatePublicPosts(updated.slug)

    return NextResponse.json({ post: updated })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiToken(request)
  if (!auth.valid) return auth.response

  try {
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const existing = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
    if (!existing.length) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    await db.delete(posts).where(eq(posts.id, id))
    revalidatePublicPosts(existing[0].slug)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
