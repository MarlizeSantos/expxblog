import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { chatConversations, chatMessages } from '@/drizzle/schema'
import { eq, and, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = Number(request.headers.get('x-user-id') ?? '0')
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  // Verifica que a conversa pertence ao usuário
  const [conv] = await db
    .select()
    .from(chatConversations)
    .where(and(eq(chatConversations.id, id), eq(chatConversations.user_id, userId)))
    .limit(1)

  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversation_id, id))
    .orderBy(asc(chatMessages.created_at))

  return NextResponse.json({ messages, conversation: conv })
}
