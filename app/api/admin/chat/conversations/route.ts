import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { chatConversations } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = Number(request.headers.get('x-user-id') ?? '0')

  const conversations = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.user_id, userId))
    .orderBy(desc(chatConversations.updated_at))
    .limit(50)

  return NextResponse.json({ conversations })
}

export async function POST(request: NextRequest) {
  const userId = Number(request.headers.get('x-user-id') ?? '0')
  const body = await request.json().catch(() => ({})) as { title?: string }

  const [conversation] = await db
    .insert(chatConversations)
    .values({ user_id: userId, title: body.title ?? 'Nova conversa' })
    .returning()

  return NextResponse.json({ conversation }, { status: 201 })
}
