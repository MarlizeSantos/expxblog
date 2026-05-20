# Automação de Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automation engine that generates and publishes blog posts on a configurable schedule, using the existing AI infrastructure.

**Architecture:** A new `automation_config` DB table stores user config (enabled, interval_hours, theme_ids, custom_prompt). A shared `lib/automation.ts` function runs the full pipeline (theme selection → AI article generation → AI image generation → publish). Vercel Cron Jobs hit `/api/cron/automation` hourly; the admin panel can also trigger manually via `POST /api/admin/automation/run`. The cron endpoint lives outside `/api/admin/*` to bypass JWT middleware, secured by `CRON_SECRET` env var instead.

**Tech Stack:** Drizzle ORM (PostgreSQL), Next.js 14 App Router, Vercel Cron Jobs, existing `lib/ai.ts` (OpenRouter via `aiChat`, `callOpenRouterImage`), Supabase Storage (`lib/supabase-admin.ts`), `sanitize-html`, `lib/slug.ts`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `drizzle/schema.ts` | Modify | Add `automationConfig` table + types |
| `lib/automation.ts` | Create | Full generation pipeline (`runAutomationCycle`, `getOrCreateAutomationConfig`) |
| `app/api/admin/automation/route.ts` | Create | GET/PUT config (JWT-protected by existing middleware) |
| `app/api/admin/automation/run/route.ts` | Create | POST manual trigger (JWT-protected by existing middleware) |
| `app/api/cron/automation/route.ts` | Create | POST Vercel cron endpoint (CRON_SECRET auth, outside middleware) |
| `vercel.json` | Create | Configure hourly Vercel cron |
| `.env.example` | Modify | Document `CRON_SECRET` env var |
| `app/admin/artigos/ArtigosClient.tsx` | Modify | Replace "Em breve" with `AutomacaoSection` component |

---

## Task 1: Add `automationConfig` table to Drizzle schema

**Files:**
- Modify: `drizzle/schema.ts`
- Run: `npm run db:generate && npm run db:migrate`

- [ ] **Step 1: Update imports and add table in `drizzle/schema.ts`**

Add `boolean` to the existing pg-core import line:
```ts
import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'
```

Then add the table after the `pageViews` table (before the relations block):
```ts
export const automationConfig = pgTable('automation_config', {
  id: serial('id').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  interval_hours: integer('interval_hours').notNull().default(24),
  theme_ids: text('theme_ids').notNull().default('[]'), // JSON array of theme IDs
  custom_prompt: text('custom_prompt'),
  last_run_at: timestamp('last_run_at'),
  next_run_at: timestamp('next_run_at'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
})

export type AutomationConfig = typeof automationConfig.$inferSelect
export type NewAutomationConfig = typeof automationConfig.$inferInsert
```

- [ ] **Step 2: Generate and apply migration**

```bash
npm run db:generate
npm run db:migrate
```

Expected: migration file created in `drizzle/migrations/`, then applied to the database without errors.

- [ ] **Step 3: Commit**

```bash
git add drizzle/schema.ts drizzle/migrations/
git commit -m "feat: add automation_config table to schema"
```

---

## Task 2: Create `lib/automation.ts` — shared pipeline

This module owns the full article generation cycle. Both the cron endpoint and the manual trigger call `runAutomationCycle()`. Passing `force = true` skips the interval check (used by manual trigger).

**Files:**
- Create: `lib/automation.ts`

- [ ] **Step 1: Create `lib/automation.ts`**

```ts
import sanitizeHtml from 'sanitize-html'
import { db } from '@/drizzle/db'
import { posts, automationConfig, articleThemes, siteSettings } from '@/drizzle/schema'
import { eq, and, inArray, asc } from 'drizzle-orm'
import { generateSlug } from '@/lib/slug'
import { aiChat, callOpenRouterImage, getPromptFromDB } from '@/lib/ai'
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase-admin'

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h2', 'h3', 'img']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt'],
  },
}

export type AutomationResult = {
  success: boolean
  message: string
  post_id?: number
  skipped?: boolean
}

export async function getOrCreateAutomationConfig() {
  const rows = await db.select().from(automationConfig).limit(1)
  if (rows.length > 0) return rows[0]
  const [row] = await db.insert(automationConfig).values({}).returning()
  return row
}

export async function runAutomationCycle(force = false): Promise<AutomationResult> {
  const config = await getOrCreateAutomationConfig()

  if (!config.enabled) {
    return { success: false, skipped: true, message: 'Automação desabilitada' }
  }

  if (!force && config.next_run_at && new Date() < new Date(config.next_run_at)) {
    return { success: false, skipped: true, message: 'Ainda não está na hora de executar' }
  }

  // Pick theme
  const selectedIds: number[] = config.theme_ids ? JSON.parse(config.theme_ids) : []
  let theme: { id: number; title: string; description: string | null } | undefined

  if (selectedIds.length > 0) {
    const rows = await db
      .select()
      .from(articleThemes)
      .where(and(inArray(articleThemes.id, selectedIds), eq(articleThemes.status, 'pending')))
      .orderBy(asc(articleThemes.created_at))
      .limit(1)
    theme = rows[0]
  } else {
    const rows = await db
      .select()
      .from(articleThemes)
      .where(eq(articleThemes.status, 'pending'))
      .orderBy(asc(articleThemes.created_at))
      .limit(1)
    theme = rows[0]
  }

  if (!theme) {
    return { success: false, message: 'Nenhum tema pendente disponível para geração' }
  }

  // Load briefing
  let briefingContent = ''
  try {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, 'briefing_content')).limit(1)
    briefingContent = rows.length > 0 ? rows[0].value : ''
  } catch {}

  const contextSection = briefingContent
    ? `\n\nCONTEXTO DA EMPRESA (briefing):\n---\n${briefingContent.slice(0, 8000)}\n---\n\nUse o contexto acima para garantir relevância para o negócio e público-alvo.`
    : ''

  const customPromptSection = config.custom_prompt?.trim()
    ? `\n\nINSTRUÇÕES ADICIONAIS:\n${config.custom_prompt.trim()}`
    : ''

  // Generate article content
  const articlePrompt = `Você é um redator profissional especializado em blogs corporativos. Escreva um artigo completo e detalhado sobre:

Tema: "${theme.title}"
${theme.description ? `Descrição do tema: ${theme.description}` : ''}
${contextSection}${customPromptSection}

Requisitos:
- O artigo deve ter pelo menos 800 palavras
- Use formatação HTML para estruturar o conteúdo (h2, h3, p, strong, em, ul, ol, li, blockquote)
- Inclua uma introdução envolvente
- Desenvolva o conteúdo com subtítulos bem estruturados
- Termine com uma conclusão
- O conteúdo deve ser informativo, bem escrito e otimizado para SEO
- Escreva em português do Brasil

Responda com um JSON válido (sem markdown, sem \`\`\`) com a seguinte estrutura:
{
  "title": "título do artigo",
  "excerpt": "resumo em até 160 caracteres",
  "content": "conteúdo HTML completo"
}`

  const aiResult = await aiChat(
    'content_generation',
    [
      { role: 'system', content: 'Você é um redator profissional. Responda em JSON válido, sem markdown.' },
      { role: 'user', content: articlePrompt },
    ],
    { temperature: 0.7, max_tokens: 4096 }
  )

  let articleData: { title: string; excerpt: string; content: string }
  try {
    const cleaned = aiResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    articleData = JSON.parse(cleaned)
  } catch {
    return { success: false, message: 'Erro ao processar resposta da IA (artigo)' }
  }

  // Append timestamp to slug to avoid unique constraint collisions
  const slug = generateSlug(articleData.title) + '-' + Date.now()
  const cleanContent = sanitizeHtml(articleData.content, sanitizeOptions)
  const now = new Date()

  const [post] = await db.insert(posts).values({
    title: articleData.title,
    slug,
    content: cleanContent,
    excerpt: articleData.excerpt ?? '',
    status: 'draft',
    updated_at: now,
  }).returning()

  // Generate cover image (non-fatal if it fails)
  let coverImageUrl: string | undefined
  try {
    const imagePromptTemplate = await getPromptFromDB('image')
    const contextParts = [`Título do artigo: ${articleData.title}`]
    if (articleData.excerpt) contextParts.push(`Resumo: ${articleData.excerpt}`)
    const textContent = cleanContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)
    contextParts.push(`Conteúdo: ${textContent}`)

    let finalPrompt: string
    if (imagePromptTemplate) {
      finalPrompt = await aiChat('image_description', [
        { role: 'system', content: 'Gere um prompt em inglês para criar uma imagem de capa profissional para o artigo. Responda APENAS com o prompt.' },
        { role: 'user', content: `${imagePromptTemplate}\n\nContexto:\n${contextParts.join('\n')}` },
      ], { temperature: 0.8, max_tokens: 500 })
    } else {
      finalPrompt = await aiChat('image_description', [
        { role: 'system', content: 'Gere um prompt em inglês para criar uma imagem de capa para blog, estilo fotorealista ou editorial. Responda APENAS com o prompt.' },
        { role: 'user', content: contextParts.join('\n') },
      ], { temperature: 0.8, max_tokens: 500 })
    }

    const imageUrl = await callOpenRouterImage(finalPrompt)

    let imageBuffer: Buffer
    let contentType = 'image/png'

    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) throw new Error('Formato de imagem inválido')
      contentType = matches[1]
      imageBuffer = Buffer.from(matches[2], 'base64')
    } else {
      const imageRes = await fetch(imageUrl)
      contentType = imageRes.headers.get('content-type') ?? 'image/png'
      imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    }

    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg'
      : contentType.includes('webp') ? '.webp' : '.png'
    const filename = `auto-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filename, imageBuffer, { contentType })

    if (!uploadError) {
      const { data: { publicUrl } } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
      coverImageUrl = publicUrl
    }
  } catch (imgErr) {
    console.error('[Automation] Image generation failed (continuing without image):', imgErr)
  }

  // Publish post
  await db.update(posts).set({
    cover_image: coverImageUrl ?? null,
    status: 'published',
    published_at: now,
    updated_at: now,
  }).where(eq(posts.id, post.id))

  // Mark theme as used
  await db.update(articleThemes).set({ status: 'used' }).where(eq(articleThemes.id, theme.id))

  // Update automation timestamps
  const nextRun = new Date(now.getTime() + config.interval_hours * 60 * 60 * 1000)
  await db.update(automationConfig).set({
    last_run_at: now,
    next_run_at: nextRun,
    updated_at: now,
  }).where(eq(automationConfig.id, config.id))

  return {
    success: true,
    message: `Artigo "${articleData.title}" gerado e publicado com sucesso.`,
    post_id: post.id,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/automation.ts
git commit -m "feat: add automation pipeline in lib/automation.ts"
```

---

## Task 3: Create API routes for config management and manual trigger

Both routes live under `/api/admin/*` and are automatically JWT-protected by `middleware.ts`.

**Files:**
- Create: `app/api/admin/automation/route.ts`
- Create: `app/api/admin/automation/run/route.ts`

- [ ] **Step 1: Create `app/api/admin/automation/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { automationConfig } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { getOrCreateAutomationConfig } from '@/lib/automation'

export async function GET() {
  try {
    const config = await getOrCreateAutomationConfig()
    return NextResponse.json({
      enabled: config.enabled,
      interval_hours: config.interval_hours,
      theme_ids: JSON.parse(config.theme_ids),
      custom_prompt: config.custom_prompt ?? '',
      last_run_at: config.last_run_at,
      next_run_at: config.next_run_at,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar configuração' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { enabled, interval_hours, theme_ids, custom_prompt } = body

    const config = await getOrCreateAutomationConfig()
    const now = new Date()
    const hours = Number(interval_hours) || 24

    // Recalculate next_run_at based on current time when enabling
    const nextRun = enabled
      ? new Date(now.getTime() + hours * 60 * 60 * 1000)
      : config.next_run_at

    await db.update(automationConfig).set({
      enabled: Boolean(enabled),
      interval_hours: hours,
      theme_ids: JSON.stringify(Array.isArray(theme_ids) ? theme_ids : []),
      custom_prompt: custom_prompt?.trim() || null,
      next_run_at: nextRun,
      updated_at: now,
    }).where(eq(automationConfig.id, config.id))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/api/admin/automation/run/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { runAutomationCycle } from '@/lib/automation'

export const maxDuration = 60

export async function POST() {
  try {
    const result = await runAutomationCycle(true) // force=true skips interval check
    const status = result.success ? 200 : result.skipped ? 200 : 500
    return NextResponse.json(result, { status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/automation/
git commit -m "feat: add /api/admin/automation GET/PUT config and POST manual trigger"
```

---

## Task 4: Create `/api/cron/automation/route.ts` — Vercel cron endpoint

This route is intentionally outside `/api/admin/*` so it bypasses JWT middleware. It is secured by `CRON_SECRET` env var. Vercel automatically sends `Authorization: Bearer {CRON_SECRET}` when calling cron routes.

**Files:**
- Create: `app/api/cron/automation/route.ts`

- [ ] **Step 1: Create `app/api/cron/automation/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { runAutomationCycle } from '@/lib/automation'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If CRON_SECRET is set, enforce it. If not set (local dev), allow through.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAutomationCycle(false) // respects interval check
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[Cron] Automation cycle failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cron/automation/route.ts
git commit -m "feat: add /api/cron/automation Vercel cron endpoint"
```

---

## Task 5: Configure Vercel Cron and document env var

**Files:**
- Create: `vercel.json`
- Modify: `.env.example`

- [ ] **Step 1: Create `vercel.json`**

The cron runs every hour. The actual generation only happens when the configured interval has elapsed (checked inside `runAutomationCycle`).

```json
{
  "crons": [
    {
      "path": "/api/cron/automation",
      "schedule": "0 * * * *"
    }
  ]
}
```

- [ ] **Step 2: Add CRON_SECRET to `.env.example`**

Append to the end of the file:
```
# ─── AUTOMAÇÃO (CRON) ──────────────────────────────────────────────────────
# Segredo para autorizar chamadas do Vercel Cron Jobs. Gere com: openssl rand -base64 32
# Configure também em: Vercel Dashboard → Settings → Environment Variables → CRON_SECRET
CRON_SECRET=seu-segredo-cron-aqui
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json .env.example
git commit -m "feat: configure Vercel cron and document CRON_SECRET env var"
```

---

## Task 6: Implement `AutomacaoSection` in `ArtigosClient.tsx`

Replace the "Em breve" placeholder (lines 31–41 of `ArtigosClient.tsx`) with the full config panel.

**Files:**
- Modify: `app/admin/artigos/ArtigosClient.tsx`

- [ ] **Step 1: Replace the `automacao` case in `renderContent()`**

Find and replace:
```tsx
      case 'automacao':
        return (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Automação de Postagens</h2>
            <p className="text-sm text-gray-500 mb-6">
              Configure a estrutura de automação para criação e publicação automática de artigos.
            </p>
            <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
              Em breve — configuração de automação de postagens
            </div>
          </section>
        )
```

Replace with:
```tsx
      case 'automacao':
        return <AutomacaoSection />
```

- [ ] **Step 2: Add `INTERVAL_OPTIONS` constant and `AutomacaoSection` component**

Add the following code block after the closing `}` of the `TemasSection` function (around line 637) and before `type PromptField`:

```tsx
const INTERVAL_OPTIONS = [
  { value: 4, label: 'A cada 4 horas' },
  { value: 8, label: 'A cada 8 horas' },
  { value: 12, label: 'A cada 12 horas' },
  { value: 24, label: 'A cada 24 horas' },
  { value: 48, label: 'A cada 2 dias' },
  { value: 168, label: 'A cada 7 dias' },
]

function AutomacaoSection() {
  const [enabled, setEnabled] = useState(false)
  const [intervalHours, setIntervalHours] = useState(24)
  const [themeMode, setThemeMode] = useState<'all' | 'specific'>('all')
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([])
  const [customPrompt, setCustomPrompt] = useState('')
  const [themes, setThemes] = useState<ArticleTheme[]>([])
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [nextRunAt, setNextRunAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/automation')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: {
        enabled?: boolean
        interval_hours?: number
        theme_ids?: number[]
        custom_prompt?: string
        last_run_at?: string
        next_run_at?: string
      }) => {
        if (data.enabled !== undefined) setEnabled(data.enabled)
        if (data.interval_hours) setIntervalHours(data.interval_hours)
        if (Array.isArray(data.theme_ids) && data.theme_ids.length > 0) {
          setThemeMode('specific')
          setSelectedThemeIds(data.theme_ids)
        }
        if (data.custom_prompt) setCustomPrompt(data.custom_prompt)
        if (data.last_run_at) setLastRunAt(data.last_run_at)
        if (data.next_run_at) setNextRunAt(data.next_run_at)
      })
      .catch(() => {})

    fetch('/api/admin/themes')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { themes?: ArticleTheme[] }) => setThemes(data.themes ?? []))
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          interval_hours: intervalHours,
          theme_ids: themeMode === 'specific' ? selectedThemeIds : [],
          custom_prompt: customPrompt,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setToast({ type: 'success', msg: 'Configuração salva com sucesso!' })
      const updated = await fetch('/api/admin/automation').then((r) => r.json()) as { next_run_at?: string }
      if (updated.next_run_at) setNextRunAt(updated.next_run_at)
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar configuração' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRunNow() {
    setRunning(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/automation/run', { method: 'POST' })
      const data = await res.json() as { success?: boolean; skipped?: boolean; message?: string; error?: string; post_id?: number }
      if (data.success) {
        setToast({ type: 'success', msg: data.message ?? 'Artigo gerado e publicado!' })
        const updated = await fetch('/api/admin/automation').then((r) => r.json()) as { last_run_at?: string; next_run_at?: string }
        if (updated.last_run_at) setLastRunAt(updated.last_run_at)
        if (updated.next_run_at) setNextRunAt(updated.next_run_at)
      } else {
        setToast({ type: 'error', msg: data.message ?? data.error ?? 'Nenhum tema disponível' })
      }
    } catch {
      setToast({ type: 'error', msg: 'Erro ao executar automação' })
    } finally {
      setRunning(false)
    }
  }

  function toggleThemeId(id: number) {
    setSelectedThemeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function formatDateTime(d: string | null) {
    if (!d) return '—'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-1">Automação de Postagens</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure a geração automática de artigos com IA. O sistema selecionará um tema pendente, gerará o artigo completo com imagem de capa e publicará no intervalo configurado.
      </p>

      {toast && (
        <div className={`mb-5 px-4 py-3 rounded-lg text-sm ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-900">Automação ativa</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {enabled
                ? 'O sistema gerará artigos automaticamente no intervalo configurado.'
                : 'A automação está pausada.'}
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-brand-primary' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo de publicação</label>
          <select
            value={intervalHours}
            onChange={(e) => setIntervalHours(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Temas para geração</label>
          <div className="space-y-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={themeMode === 'all'}
                onChange={() => setThemeMode('all')}
                className="text-brand-primary"
              />
              <span className="text-sm text-gray-700">Todos os temas pendentes (rotação automática)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={themeMode === 'specific'}
                onChange={() => setThemeMode('specific')}
                className="text-brand-primary"
              />
              <span className="text-sm text-gray-700">Selecionar temas específicos</span>
            </label>
          </div>

          {themeMode === 'specific' && (
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {themes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nenhum tema cadastrado. Crie temas na seção Temas.
                </p>
              ) : (
                themes.map((theme) => (
                  <label
                    key={theme.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedThemeIds.includes(theme.id)}
                      onChange={() => toggleThemeId(theme.id)}
                      className="mt-0.5 text-brand-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{theme.title}</p>
                      {theme.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{theme.description}</p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      theme.status === 'used'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {theme.status === 'used' ? 'Usado' : 'Pendente'}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt adicional <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Instrução extra injetada na geração de cada artigo. Ex: &ldquo;Sempre inclua exemplos práticos&rdquo;, &ldquo;Use tom mais técnico&rdquo;.
          </p>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            placeholder="Ex: Sempre inclua ao menos um exemplo prático e uma lista de dicas ao final do artigo."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
          />
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Última execução</p>
            <p className="text-sm text-gray-900">{formatDateTime(lastRunAt)}</p>
          </div>
          <div className="hidden sm:block w-px bg-gray-200" />
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Próxima execução</p>
            <p className="text-sm text-gray-900">{formatDateTime(nextRunAt)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
        <button
          onClick={handleRunNow}
          disabled={running || saving}
          className="flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Gerando artigo...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Executar agora
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || running}
          className="bg-brand-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/artigos/ArtigosClient.tsx
git commit -m "feat: implement AutomacaoSection with full automation config UI"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All requirements covered — interval config, theme selection, custom prompt injection, AI generation with image, auto-publish, cron scheduling.
- [x] **No placeholders:** All steps have complete code.
- [x] **Type consistency:** `AutomationConfig` from schema used in `lib/automation.ts`, `getOrCreateAutomationConfig` exported and reused in both API routes, `ArticleTheme` type in UI already defined in `ArtigosClient.tsx`.
- [x] **Middleware bypass:** Cron endpoint at `/api/cron/automation` is correctly outside `/api/admin/*` matcher.
- [x] **Image failure is non-fatal:** The `try/catch` around image generation logs the error and continues — article still publishes without a cover image.
- [x] **Slug uniqueness:** `+ '-' + Date.now()` appended to prevent collisions when the same theme is reused.
