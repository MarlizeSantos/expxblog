// app/api/admin/db-migrate/route.ts
import { getDbPendingMigrations, ensureMigrationsTable, applyMigration } from '@/lib/db-migrations'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type MigrateEvent =
  | { type: 'migration'; name: string; status: 'applying' | 'done' | 'skipped' }
  | { type: 'complete'; message: string }
  | { type: 'error'; name: string; message: string }

function makeEvent(event: MigrateEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export async function POST() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const close = () => {
        if (!closed) { closed = true; controller.close() }
      }
      const send = (event: MigrateEvent) => {
        if (!closed) controller.enqueue(encoder.encode(makeEvent(event)))
      }

      try {
        const pending = await getDbPendingMigrations()

        if (pending.length === 0) {
          send({ type: 'complete', message: 'Banco já está atualizado.' })
          close()
          return
        }

        await ensureMigrationsTable()

        for (const tag of pending) {
          send({ type: 'migration', name: tag, status: 'applying' })
          try {
            await applyMigration(tag)
            send({ type: 'migration', name: tag, status: 'done' })
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            send({ type: 'error', name: tag, message })
            close()
            return
          }
        }

        send({ type: 'complete', message: 'Todas as migrations aplicadas com sucesso.' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send({ type: 'error', name: '', message })
      } finally {
        close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
