// lib/agent-configs.ts
import { db } from '@/drizzle/db'
import { agentConfigs } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { AGENT_DEFINITIONS, AgentId } from '@/lib/agents/types'

export interface ResolvedAgentConfig {
  id: AgentId
  label: string
  description: string
  prompt: string
  model: string
  supportsImageModel: boolean
}

export async function getAgentConfigs(): Promise<ResolvedAgentConfig[]> {
  const rows = await db.select().from(agentConfigs)
  const stored = Object.fromEntries(rows.map((r) => [r.id, r]))

  return AGENT_DEFINITIONS.map((def) => ({
    id: def.id,
    label: def.label,
    description: def.description,
    supportsImageModel: def.supportsImageModel,
    prompt: stored[def.id]?.prompt ?? def.defaultPrompt,
    model: stored[def.id]?.model ?? def.defaultModel,
  }))
}

export async function getAgentConfig(id: AgentId): Promise<ResolvedAgentConfig> {
  const all = await getAgentConfigs()
  const found = all.find((c) => c.id === id)
  if (!found) throw new Error(`Unknown agent: ${id}`)
  return found
}

export async function upsertAgentConfig(
  id: AgentId,
  patch: { prompt?: string; model?: string }
): Promise<void> {
  const def = AGENT_DEFINITIONS.find((d) => d.id === id)
  if (!def) throw new Error(`Unknown agent: ${id}`)

  const now = new Date()
  await db
    .insert(agentConfigs)
    .values({
      id,
      prompt: patch.prompt ?? def.defaultPrompt,
      model: patch.model ?? def.defaultModel,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: agentConfigs.id,
      set: {
        ...(patch.prompt !== undefined ? { prompt: patch.prompt } : {}),
        ...(patch.model !== undefined ? { model: patch.model } : {}),
        updated_at: now,
      },
    })
}
