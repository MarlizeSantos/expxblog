import { NextRequest } from 'next/server'
import { createPipelineStream } from '@/lib/agent-pipeline'
import { PublisherTriggers } from '@/lib/agents/types'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    themeIds?: number[]
    publishStatus?: 'draft' | 'published'
    headline?: string
    initialLinks?: string[]
    themeTitle?: string
    themeDescription?: string
    pastedText?: string
  }

  const triggers: PublisherTriggers = {
    publishStatus: body.publishStatus ?? 'published',
  }

  const stream = createPipelineStream({
    themeIds: body.themeIds ?? [],
    triggers,
    initialContext: {
      ...(body.headline ? { headline: body.headline } : {}),
      ...(body.initialLinks?.length ? { researchLinks: body.initialLinks } : {}),
      ...(body.themeTitle ? { themeTitle: body.themeTitle } : {}),
      ...(body.themeDescription ? { themeDescription: body.themeDescription } : {}),
      ...(body.pastedText ? { pastedText: body.pastedText } : {}),
    },
    signal: request.signal,
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
