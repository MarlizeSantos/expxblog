// lib/db-migrations.ts
import fs from 'fs'
import path from 'path'
import { db } from '@/drizzle/db'
import { sql } from 'drizzle-orm'

interface JournalEntry {
  idx: number
  version: string
  when: number
  tag: string
  breakpoints: boolean
}

interface Journal {
  version: string
  dialect: string
  entries: JournalEntry[]
}

function readJournal(): string[] {
  try {
    const journalPath = path.join(process.cwd(), 'drizzle', 'migrations', 'meta', '_journal.json')
    const raw = fs.readFileSync(journalPath, 'utf-8')
    const journal: Journal = JSON.parse(raw)
    return journal.entries.map((e) => e.tag)
  } catch {
    return []
  }
}

async function getAppliedMigrations(): Promise<string[]> {
  try {
    const rows = await db.execute(
      sql`SELECT migration_name FROM drizzle_migrations ORDER BY created_at ASC`
    )
    return (rows as unknown as { migration_name: string }[]).map((r) => r.migration_name)
  } catch {
    // tabela não existe — banco em branco
    return []
  }
}

export async function getDbPendingMigrations(): Promise<string[]> {
  const all = readJournal()
  if (all.length === 0) return []
  const applied = await getAppliedMigrations()
  return all.filter((tag) => !applied.includes(tag))
}

export async function ensureMigrationsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle_migrations (
      id serial PRIMARY KEY,
      migration_name text NOT NULL UNIQUE,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `)
}

export async function applyMigration(tag: string): Promise<void> {
  const sqlPath = path.join(process.cwd(), 'drizzle', 'migrations', `${tag}.sql`)
  const raw = fs.readFileSync(sqlPath, 'utf-8')

  // Drizzle separa statements com --> statement-breakpoint
  const statements = raw
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }

  await db.execute(
    sql`INSERT INTO drizzle_migrations (migration_name) VALUES (${tag})
        ON CONFLICT (migration_name) DO NOTHING`
  )
}
