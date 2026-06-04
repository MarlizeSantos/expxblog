import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { chatConversations, chatMessages } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = Number(request.headers.get('x-user-id') ?? '0')
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const deleted = await db
    .delete(chatConversations)
    .where(and(eq(chatConversations.id, id), eq(chatConversations.user_id, userId)))
    .returning()

  if (!deleted.length) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  return NextResponse.json({ success: true })
}
