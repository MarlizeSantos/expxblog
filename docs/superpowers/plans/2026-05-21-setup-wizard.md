# Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wizard de instalação estilo WordPress em `/setup` que configura Supabase, roda migrations, cria o usuário admin e persiste as env vars na Vercel — tudo pela UI.

**Architecture:** O middleware detecta ausência de `DATABASE_URL` e redireciona `/admin/*` para `/setup`. O wizard tem 6 steps sequenciais com 4 API routes internas (`/api/setup/*`) que são bloqueadas após instalação. Migrations rodam via SQL direto (sem CLI) para funcionar no servidor Vercel.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, postgres.js, Vercel REST API, `crypto` (Node built-in), bcryptjs, jose.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `middleware.ts` | Modificar | Detectar `DATABASE_URL` ausente → redirecionar para `/setup` |
| `drizzle/setup-sql.ts` | Criar | String SQL com `CREATE TABLE IF NOT EXISTS` de todas as tabelas |
| `app/api/setup/verify-vercel/route.ts` | Criar | Validar Vercel token via API |
| `app/api/setup/test-db/route.ts` | Criar | Testar conexão com banco temporária |
| `app/api/setup/install/route.ts` | Criar | Executar migrations + criar admin + salvar env vars + redeploy |
| `app/api/setup/deploy-status/route.ts` | Criar | Polling do status do redeploy na Vercel API |
| `app/setup/page.tsx` | Criar | Wizard client component com 6 steps |

---

## Task 1: SQL de criação das tabelas

**Files:**
- Create: `drizzle/setup-sql.ts`

- [ ] **Step 1: Criar o arquivo com o SQL completo**

Crie `drizzle/setup-sql.ts` com o conteúdo abaixo. Este SQL cria todas as tabelas do schema atual usando `IF NOT EXISTS` para ser idempotente. Derivado do `drizzle/schema.ts`.

```typescript
export const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text UNIQUE NOT NULL,
  "password_hash" text NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL DEFAULT 'admin',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "excerpt" text NOT NULL DEFAULT '',
  "cover_image" text,
  "status" text NOT NULL DEFAULT 'draft',
  "published_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "posts_status_idx" ON "posts" ("status");
CREATE INDEX IF NOT EXISTS "posts_published_at_idx" ON "posts" ("published_at");

CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text UNIQUE NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "description" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tags" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text UNIQUE NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "post_categories" (
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "category_id" integer NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "category_id")
);

CREATE TABLE IF NOT EXISTS "post_tags" (
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "tag_id" integer NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "site_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "token" text UNIQUE NOT NULL,
  "active" text NOT NULL DEFAULT 'true',
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "article_themes" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "source" text NOT NULL DEFAULT 'manual',
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "article_themes_status_idx" ON "article_themes" ("status");

CREATE TABLE IF NOT EXISTS "page_views" (
  "id" serial PRIMARY KEY NOT NULL,
  "path" text NOT NULL,
  "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
  "post_slug" text,
  "post_title" text,
  "referrer" text,
  "user_agent" text,
  "ip" text,
  "visited_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "page_views_visited_at_idx" ON "page_views" ("visited_at");
CREATE INDEX IF NOT EXISTS "page_views_post_id_idx" ON "page_views" ("post_id");
CREATE INDEX IF NOT EXISTS "page_views_path_idx" ON "page_views" ("path");

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text UNIQUE NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "subscribed_at" timestamp NOT NULL DEFAULT now(),
  "unsubscribed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "newsletter_email_idx" ON "newsletter_subscribers" ("email");
CREATE INDEX IF NOT EXISTS "newsletter_status_idx" ON "newsletter_subscribers" ("status");

CREATE TABLE IF NOT EXISTS "automation_config" (
  "id" serial PRIMARY KEY NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "interval_hours" real NOT NULL DEFAULT 24,
  "theme_ids" text NOT NULL DEFAULT '[]',
  "custom_prompt" text,
  "last_run_at" timestamp,
  "next_run_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
`
```

- [ ] **Step 2: Commit**

```bash
git add drizzle/setup-sql.ts
git commit -m "feat: add setup SQL migration script for wizard"
```

---

## Task 2: API route — verify-vercel

**Files:**
- Create: `app/api/setup/verify-vercel/route.ts`

- [ ] **Step 1: Criar a route**

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Already installed' }, { status: 403 })
  }

  const { token } = await req.json()
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
  }

  const res = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    return NextResponse.json({ valid: false, error: 'Token inválido' })
  }

  const projectId = process.env.VERCEL_PROJECT_ID ?? null
  const teamId = process.env.VERCEL_TEAM_ID ?? null

  return NextResponse.json({ valid: true, projectId, teamId })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/setup/verify-vercel/route.ts
git commit -m "feat: add setup verify-vercel API route"
```

---

## Task 3: API route — test-db

**Files:**
- Create: `app/api/setup/test-db/route.ts`

- [ ] **Step 1: Criar a route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import postgres from 'postgres'

export async function POST(req: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Already installed' }, { status: 403 })
  }

  const { databaseUrl } = await req.json()
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL obrigatória' })
  }

  let client: ReturnType<typeof postgres> | null = null
  try {
    client = postgres(databaseUrl, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      connect_timeout: 10,
    })
    await client`SELECT 1`
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ ok: false, error: message })
  } finally {
    if (client) await client.end()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/setup/test-db/route.ts
git commit -m "feat: add setup test-db API route"
```

---

## Task 4: API route — install

**Files:**
- Create: `app/api/setup/install/route.ts`

Esta é a rota mais crítica. Executa em sequência: migrations → cria admin → gera secrets → salva env vars na Vercel → dispara redeploy.

- [ ] **Step 1: Criar a route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import postgres from 'postgres'
import { randomBytes } from 'crypto'
import { hashPassword } from '@/lib/auth'
import { SETUP_SQL } from '@/drizzle/setup-sql'

export async function POST(req: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Already installed' }, { status: 403 })
  }

  const body = await req.json()
  const { vercelToken, databaseUrl, supabaseUrl, serviceRoleKey, adminName, adminEmail, adminPassword } = body

  if (!vercelToken || !databaseUrl || !supabaseUrl || !serviceRoleKey || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
  }

  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID

  if (!projectId) {
    return NextResponse.json({ error: 'VERCEL_PROJECT_ID não encontrado. O projeto deve estar hospedado na Vercel.' }, { status: 400 })
  }

  let client: ReturnType<typeof postgres> | null = null
  try {
    // 1. Conectar ao banco
    client = postgres(databaseUrl, {
      ssl: { rejectUnauthorized: false },
      max: 1,
      connect_timeout: 10,
    })

    // 2. Rodar migrations
    await client.unsafe(SETUP_SQL)

    // 3. Criar usuário admin
    const passwordHash = await hashPassword(adminPassword)
    await client`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${adminEmail}, ${passwordHash}, ${adminName}, 'admin')
      ON CONFLICT (email) DO NOTHING
    `

    // 4. Gerar secrets
    const jwtSecret = randomBytes(32).toString('base64')
    const cronSecret = randomBytes(32).toString('base64')

    // 5. Salvar env vars na Vercel
    const envVars = [
      { key: 'DATABASE_URL', value: databaseUrl, type: 'encrypted', target: ['production', 'preview'] },
      { key: 'NEXT_PUBLIC_SUPABASE_URL', value: supabaseUrl, type: 'plain', target: ['production', 'preview'] },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', value: serviceRoleKey, type: 'encrypted', target: ['production', 'preview'] },
      { key: 'JWT_SECRET', value: jwtSecret, type: 'encrypted', target: ['production', 'preview'] },
      { key: 'CRON_SECRET', value: cronSecret, type: 'encrypted', target: ['production', 'preview'] },
    ]

    const teamParam = teamId ? `?teamId=${teamId}` : ''
    const envRes = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env${teamParam}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envVars),
    })

    if (!envRes.ok) {
      const errBody = await envRes.text()
      return NextResponse.json({ error: `Falha ao salvar env vars na Vercel: ${errBody}` }, { status: 500 })
    }

    // 6. Buscar último deployment para usar como base do redeploy
    const deploysRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1${teamId ? `&teamId=${teamId}` : ''}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    )
    const deploysData = await deploysRes.json()
    const lastDeployment = deploysData.deployments?.[0]

    if (!lastDeployment) {
      return NextResponse.json({ error: 'Nenhum deployment encontrado para redesployar' }, { status: 500 })
    }

    // 7. Disparar redeploy
    const redeployRes = await fetch(`https://api.vercel.com/v13/deployments${teamId ? `?teamId=${teamId}` : ''}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deploymentId: lastDeployment.uid,
        name: lastDeployment.name,
        target: 'production',
      }),
    })

    const redeployData = await redeployRes.json()

    if (!redeployRes.ok) {
      return NextResponse.json({ error: `Falha ao redesployar: ${JSON.stringify(redeployData)}` }, { status: 500 })
    }

    return NextResponse.json({ deploymentId: redeployData.id ?? redeployData.uid })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (client) await client.end()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/setup/install/route.ts
git commit -m "feat: add setup install API route (migrations + admin + vercel env + redeploy)"
```

---

## Task 5: API route — deploy-status

**Files:**
- Create: `app/api/setup/deploy-status/route.ts`

- [ ] **Step 1: Criar a route**

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Already installed' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const deploymentId = searchParams.get('deploymentId')
  const vercelToken = searchParams.get('vercelToken')
  const teamId = process.env.VERCEL_TEAM_ID

  if (!deploymentId || !vercelToken) {
    return NextResponse.json({ error: 'deploymentId e vercelToken obrigatórios' }, { status: 400 })
  }

  const teamParam = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}${teamParam}`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  })

  if (!res.ok) {
    return NextResponse.json({ state: 'ERROR', error: 'Falha ao consultar status do deployment' })
  }

  const data = await res.json()
  return NextResponse.json({
    state: data.readyState ?? data.status ?? 'BUILDING',
    url: data.url ? `https://${data.url}` : undefined,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/setup/deploy-status/route.ts
git commit -m "feat: add setup deploy-status polling API route"
```

---

## Task 6: Middleware — detecção de DATABASE_URL

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Ler o arquivo atual**

Leia `middleware.ts` antes de editar.

- [ ] **Step 2: Substituir o conteúdo**

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Se banco não configurado, redirecionar admin para /setup
  if (!process.env.DATABASE_URL) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/setup', request.url))
    }
    return NextResponse.next()
  }

  // Se já instalado, bloquear /setup
  if (pathname === '/setup' || pathname.startsWith('/setup/')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const token = request.cookies.get('auth_token')?.value
  const isApiRoute = pathname.startsWith('/api/admin')
  const isLoginPage = pathname === '/admin/login'

  if (isLoginPage) return NextResponse.next()

  const payload = token ? await verifyToken(token) : null

  if (!payload) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-user-id', String(payload.userId))
  response.headers.set('x-user-email', payload.email)
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/setup', '/setup/:path*'],
}
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: extend middleware to detect missing DATABASE_URL and redirect to /setup"
```

---

## Task 7: Wizard page — /setup

**Files:**
- Create: `app/setup/page.tsx`

Esta é a maior tarefa. O wizard tem 6 steps com estado local. Implementar como client component único.

- [ ] **Step 1: Criar a página**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 1 | 2 | 3 | 4 | 5 | 6

interface SetupState {
  vercelToken: string
  projectId: string | null
  teamId: string | null
  databaseUrl: string
  supabaseUrl: string
  serviceRoleKey: string
  dbTested: boolean
  adminName: string
  adminEmail: string
  adminPassword: string
  adminPasswordConfirm: string
}

const STEPS = [
  'Vercel',
  'Supabase',
  'Banco de dados',
  'Administrador',
  'Finalizando',
  'Concluído',
]

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deploymentId, setDeploymentId] = useState('')
  const [deployUrl, setDeployUrl] = useState('')

  const [state, setState] = useState<SetupState>({
    vercelToken: '',
    projectId: null,
    teamId: null,
    databaseUrl: '',
    supabaseUrl: '',
    serviceRoleKey: '',
    dbTested: false,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  })

  function set(field: keyof SetupState, value: string | boolean | null) {
    setState((s) => ({ ...s, [field]: value }))
  }

  async function verifyVercel() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/setup/verify-vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.vercelToken }),
      })
      const data = await res.json()
      if (!data.valid) {
        setError(data.error ?? 'Token inválido')
        return
      }
      setState((s) => ({ ...s, projectId: data.projectId, teamId: data.teamId }))
      setStep(2)
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  async function testDb() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/setup/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseUrl: state.databaseUrl,
          supabaseUrl: state.supabaseUrl,
          serviceRoleKey: state.serviceRoleKey,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error ?? 'Falha na conexão')
        return
      }
      set('dbTested', true)
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  async function runMigrations() {
    setError('')
    setLoading(true)
    setStep(3)
    // migrations rodam dentro do /install — avança direto para step 4
    setLoading(false)
    setStep(4)
  }

  async function install() {
    setError('')
    if (state.adminPassword !== state.adminPasswordConfirm) {
      setError('As senhas não coincidem')
      return
    }
    if (state.adminPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }
    setLoading(true)
    setStep(5)
    try {
      const res = await fetch('/api/setup/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vercelToken: state.vercelToken,
          databaseUrl: state.databaseUrl,
          supabaseUrl: state.supabaseUrl,
          serviceRoleKey: state.serviceRoleKey,
          adminName: state.adminName,
          adminEmail: state.adminEmail,
          adminPassword: state.adminPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Falha na instalação')
        setStep(4)
        return
      }
      setDeploymentId(data.deploymentId)
      pollDeployStatus(data.deploymentId)
    } catch {
      setError('Erro de conexão')
      setStep(4)
    } finally {
      setLoading(false)
    }
  }

  function pollDeployStatus(depId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/setup/deploy-status?deploymentId=${depId}&vercelToken=${encodeURIComponent(state.vercelToken)}`
        )
        const data = await res.json()
        if (data.state === 'READY') {
          clearInterval(interval)
          if (data.url) setDeployUrl(data.url)
          setStep(6)
        } else if (data.state === 'ERROR' || data.state === 'CANCELED') {
          clearInterval(interval)
          setError('O redeploy falhou. Acesse o painel da Vercel para mais detalhes. As configurações já foram salvas — basta fazer um redeploy manual.')
        }
      } catch {
        // continua tentando
      }
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📰</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">Configuração inicial</h1>
              <p className="text-sm text-gray-500">Step {step} de {STEPS.length}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-brand-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={`text-xs ${i + 1 <= step ? 'text-brand-primary font-medium' : 'text-gray-400'}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1 — Vercel Token */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 mb-1">Conectar à Vercel</h2>
                <p className="text-sm text-gray-500">
                  Gere um Access Token em{' '}
                  <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">vercel.com/account/tokens</span>{' '}
                  e cole abaixo. Ele será usado apenas durante a configuração.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vercel Access Token</label>
                <input
                  type="password"
                  value={state.vercelToken}
                  onChange={(e) => set('vercelToken', e.target.value)}
                  placeholder="vercel_..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent font-mono"
                />
              </div>
              <button
                onClick={verifyVercel}
                disabled={!state.vercelToken || loading}
                className="w-full bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verificando...' : 'Verificar e continuar'}
              </button>
            </div>
          )}

          {/* Step 2 — Supabase */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 mb-1">Credenciais do Supabase</h2>
                <p className="text-sm text-gray-500">
                  Encontre em: Supabase Dashboard → Project Settings → Database / API.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Database URL</label>
                <input
                  type="password"
                  value={state.databaseUrl}
                  onChange={(e) => { set('databaseUrl', e.target.value); set('dbTested', false) }}
                  placeholder="postgresql://postgres:[SENHA]@db.[PROJETO].supabase.co:6543/postgres"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">Use a connection string do pooler, porta 6543</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supabase URL</label>
                <input
                  type="text"
                  value={state.supabaseUrl}
                  onChange={(e) => set('supabaseUrl', e.target.value)}
                  placeholder="https://[PROJETO].supabase.co"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Role Key</label>
                <input
                  type="password"
                  value={state.serviceRoleKey}
                  onChange={(e) => { set('serviceRoleKey', e.target.value); set('dbTested', false) }}
                  placeholder="eyJ..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent font-mono"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={testDb}
                  disabled={!state.databaseUrl || !state.supabaseUrl || !state.serviceRoleKey || loading}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Testando...' : state.dbTested ? '✓ Conexão OK' : 'Testar conexão'}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!state.dbTested}
                  className="flex-1 bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Migrations (automático) */}
          {step === 3 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-base font-semibold text-neutral-900">Configurando banco de dados...</h2>
              <p className="text-sm text-gray-500">Criando tabelas. Aguarde um momento.</p>
              <button
                onClick={runMigrations}
                className="hidden"
                id="run-migrations-trigger"
              />
            </div>
          )}

          {/* Step 4 — Admin user */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 mb-1">Criar administrador</h2>
                <p className="text-sm text-gray-500">Este será o usuário master do painel.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={state.adminName}
                  onChange={(e) => set('adminName', e.target.value)}
                  placeholder="Seu nome"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={state.adminEmail}
                  onChange={(e) => set('adminEmail', e.target.value)}
                  placeholder="admin@exemplo.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={state.adminPassword}
                  onChange={(e) => set('adminPassword', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                <input
                  type="password"
                  value={state.adminPasswordConfirm}
                  onChange={(e) => set('adminPasswordConfirm', e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <button
                onClick={install}
                disabled={!state.adminName || !state.adminEmail || !state.adminPassword || !state.adminPasswordConfirm || loading}
                className="w-full bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Instalando...' : 'Finalizar instalação'}
              </button>
            </div>
          )}

          {/* Step 5 — Deploy em progresso */}
          {step === 5 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-base font-semibold text-neutral-900">Redesployando...</h2>
              <p className="text-sm text-gray-500">
                Salvando configurações e iniciando novo deploy na Vercel. Isso pode levar alguns minutos.
              </p>
              {deploymentId && (
                <p className="text-xs text-gray-400 font-mono">{deploymentId}</p>
              )}
              {error && (
                <div className="text-left bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  {error}
                  <br />
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium mt-2 inline-block"
                  >
                    Abrir painel da Vercel
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Step 6 — Concluído */}
          {step === 6 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-base font-semibold text-neutral-900">Instalação concluída!</h2>
              <p className="text-sm text-gray-500">
                O blog está configurado e pronto. Faça login com as credenciais abaixo.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                <div>
                  <span className="text-xs text-gray-500 block">Nome</span>
                  <span className="text-sm font-medium text-neutral-900">{state.adminName}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Email</span>
                  <span className="text-sm font-mono text-neutral-900">{state.adminEmail}</span>
                </div>
              </div>
              {deployUrl && (
                <p className="text-xs text-gray-400">
                  Deploy em:{' '}
                  <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    {deployUrl}
                  </a>
                </p>
              )}
              <a
                href="/admin/login"
                className="block w-full bg-brand-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors text-center"
              >
                Acessar o painel
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Corrigir step 3 — trigger automático das migrations**

O step 3 precisa disparar `runMigrations` automaticamente ao montar. Adicione um `useEffect` ao componente (após a declaração de `pollDeployStatus`):

```typescript
// Adicionar import no topo:
import { useState, useEffect } from 'react'

// Adicionar dentro do componente, após pollDeployStatus:
useEffect(() => {
  if (step === 3) {
    runMigrations()
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [step])
```

Edite `app/setup/page.tsx`:
- Linha 1: altere `import { useState } from 'react'` para `import { useState, useEffect } from 'react'`
- Após a função `pollDeployStatus`, adicione o `useEffect` acima
- Remova o `<button id="run-migrations-trigger">` do JSX do step 3 (não é mais necessário)

- [ ] **Step 3: Commit**

```bash
git add app/setup/page.tsx
git commit -m "feat: add setup wizard page with 6-step onboarding flow"
```

---

## Task 8: Verificação manual

- [ ] **Step 1: Checar que os arquivos existem**

```bash
ls app/api/setup/
# esperado: deploy-status/  install/  test-db/  verify-vercel/

ls app/setup/
# esperado: page.tsx

ls drizzle/
# esperado: db.ts  migrations/  schema.ts  setup-sql.ts
```

- [ ] **Step 2: Build de verificação**

```bash
npm run build
```

Esperado: build bem-sucedido sem erros de TypeScript. Se houver erros de tipo, corrija antes de continuar.

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: setup wizard — full onboarding flow complete"
git push origin master
```

---

## Self-Review — Cobertura do Spec

| Requisito do spec | Task |
|---|---|
| Middleware detecta DATABASE_URL ausente → redireciona /admin para /setup | Task 6 |
| Middleware bloqueia /setup se já instalado | Task 6 |
| Step 1: Vercel token + validação | Task 2, Task 7 |
| Step 2: Supabase credentials + teste obrigatório | Task 3, Task 7 |
| Step 3: Migrations automáticas (sem CLI) | Task 1, Task 4, Task 7 |
| Step 4: Usuário admin (nome, email, senha ≥8, confirmação) | Task 4, Task 7 |
| Step 5: Gerar JWT_SECRET e CRON_SECRET | Task 4 |
| Step 5: Salvar env vars na Vercel API | Task 4 |
| Step 5: Disparar redeploy | Task 4 |
| Step 5: Polling do deploy status | Task 5, Task 7 |
| Step 5: Tratamento de erro no redeploy + link para Vercel | Task 7 |
| Step 6: Exibir credenciais do admin + botão de acesso | Task 7 |
| Rotas /api/setup/* retornam 403 se DATABASE_URL presente | Tasks 2, 3, 4, 5 |
