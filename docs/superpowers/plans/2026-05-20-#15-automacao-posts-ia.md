# Automação de Posts com IA

## Visão Geral

Implementação de um motor de automação que gera e publica artigos completos no blog de forma autônoma, sem intervenção humana. O sistema seleciona um tema pendente da tabela `article_themes`, gera o artigo completo com IA (incluindo título, conteúdo HTML e resumo), gera uma imagem de capa também com IA, faz upload no Supabase Storage e publica o post — tudo dentro do intervalo configurado pelo admin.

O Vercel Cron Jobs dispara o processo automaticamente a cada hora. O sistema verifica se o intervalo configurado já passou e, se sim, executa o ciclo completo. O admin também pode disparar manualmente pelo painel.

---

## Funcionalidades

### Painel de Configuração (Admin → Artigos → Automação)

- **Toggle ativo/inativo** — Liga ou pausa a automação sem perder as configurações
- **Intervalo de publicação** — Escolha entre 4h, 8h, 12h, 24h, 2 dias ou 7 dias
- **Seleção de temas** — Usar todos os temas pendentes (rotação automática) ou selecionar temas específicos com checkboxes
- **Prompt adicional** — Campo opcional para injetar instruções extras na geração (ex: "Sempre inclua exemplos práticos", "Use tom mais técnico")
- **Status** — Exibe data/hora da última execução e da próxima execução programada
- **Executar agora** — Disparo manual imediato que ignora o intervalo e gera um artigo na hora

### Pipeline de Geração

Quando o ciclo é disparado (por cron ou manualmente):

1. Verifica se a automação está ativa e se o intervalo já passou
2. Seleciona o tema pendente mais antigo (do conjunto configurado ou de todos os pendentes)
3. Busca o briefing salvo em `site_settings` para contextualizar a IA
4. Chama `aiChat('content_generation', ...)` com o prompt completo (tema + briefing + prompt adicional)
5. Faz parse do JSON retornado pela IA: `{ title, excerpt, content }`
6. Sanitiza o HTML com `sanitize-html`
7. Insere o post como rascunho no banco com slug único (sufixo timestamp)
8. Gera imagem de capa via `callOpenRouterImage()` com prompt em inglês gerado pela IA
9. Faz upload da imagem no Supabase Storage
10. Atualiza o post: `cover_image`, `status = 'published'`, `published_at = now()`
11. Marca o tema como `status = 'used'`
12. Atualiza `last_run_at` e `next_run_at` na tabela de configuração

Se a geração de imagem falhar, o artigo é publicado mesmo assim (sem imagem de capa). A falha é registrada no log do servidor mas não interrompe o ciclo.

---

## Arquivos Criados

### Banco de Dados

| Arquivo | Alteração |
|---------|-----------|
| `drizzle/schema.ts` | Nova tabela `automationConfig` + tipos `AutomationConfig` e `NewAutomationConfig` |
| `drizzle/migrations/0004_rich_stryfe.sql` | Migration gerada automaticamente pelo Drizzle |

### Lógica Compartilhada

| Arquivo | Descrição |
|---------|-----------|
| `lib/automation.ts` | Pipeline completo de geração. Exporta `runAutomationCycle(force?)` e `getOrCreateAutomationConfig()` |

### Rotas de API

| Arquivo | Método | Descrição |
|---------|--------|-----------|
| `app/api/admin/automation/route.ts` | GET | Retorna a configuração atual da automação |
| `app/api/admin/automation/route.ts` | PUT | Salva configuração (enabled, interval_hours, theme_ids, custom_prompt) |
| `app/api/admin/automation/run/route.ts` | POST | Disparo manual — `force=true` ignora o intervalo |
| `app/api/cron/automation/route.ts` | POST | Endpoint chamado pelo Vercel Cron — verifica `CRON_SECRET` |

### Infra

| Arquivo | Descrição |
|---------|-----------|
| `vercel.json` | Configura o Vercel Cron para chamar `/api/cron/automation` toda hora (`0 * * * *`) |
| `.env.example` | Documenta a variável `CRON_SECRET` |

## Arquivo Modificado

| Arquivo | Alteração |
|---------|-----------|
| `app/admin/artigos/ArtigosClient.tsx` | Substituiu o placeholder "Em breve" na seção Automação pelo componente `AutomacaoSection` completo |

---

## Tabela `automation_config`

```sql
CREATE TABLE automation_config (
  id              SERIAL PRIMARY KEY,
  enabled         BOOLEAN NOT NULL DEFAULT false,
  interval_hours  INTEGER NOT NULL DEFAULT 24,
  theme_ids       TEXT NOT NULL DEFAULT '[]',      -- JSON: number[]
  custom_prompt   TEXT,
  last_run_at     TIMESTAMP,
  next_run_at     TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);
```

A tabela sempre tem exatamente uma linha. `getOrCreateAutomationConfig()` em `lib/automation.ts` insere o registro padrão na primeira chamada se não existir.

---

## Segurança

### Endpoint Cron (`/api/cron/automation`)

Este endpoint fica **fora** do matcher do `middleware.ts` (que só protege `/api/admin/*`), portanto precisa de proteção própria. A variável `CRON_SECRET` é obrigatória:

```ts
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

O Vercel envia automaticamente `Authorization: Bearer {CRON_SECRET}` nas chamadas de cron. Configure a variável em **Vercel Dashboard → Settings → Environment Variables**.

### Endpoints Admin

`GET/PUT /api/admin/automation` e `POST /api/admin/automation/run` ficam dentro de `/api/admin/*` e são protegidos automaticamente pelo JWT middleware existente.

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `CRON_SECRET` | Sim (produção) | Segredo para autenticar chamadas do Vercel Cron. Gere com `openssl rand -base64 32` |

As demais variáveis (`DATABASE_URL`, `JWT_SECRET`, etc.) já eram necessárias antes desta feature.

---

## Configuração no Vercel

1. Gere um segredo: `openssl rand -base64 32`
2. Configure em **Vercel Dashboard → Settings → Environment Variables → `CRON_SECRET`**
3. Faça deploy — o `vercel.json` já registra o cron automaticamente
4. No painel admin, vá em **Artigos → Automação**, configure o intervalo e ative

---

## Detalhes das APIs

### GET `/api/admin/automation`

Response:
```json
{
  "enabled": false,
  "interval_hours": 24,
  "theme_ids": [],
  "custom_prompt": "",
  "last_run_at": null,
  "next_run_at": null
}
```

### PUT `/api/admin/automation`

Request:
```json
{
  "enabled": true,
  "interval_hours": 24,
  "theme_ids": [1, 5, 12],
  "custom_prompt": "Sempre inclua exemplos práticos"
}
```

Ao habilitar (`enabled: true`), `next_run_at` é recalculado como `now() + interval_hours`.

Response:
```json
{ "success": true }
```

### POST `/api/admin/automation/run`

Sem body. Dispara `runAutomationCycle(true)` — o `force=true` ignora o `next_run_at`.

Response (sucesso):
```json
{
  "success": true,
  "message": "Artigo \"Título do Artigo\" gerado e publicado com sucesso.",
  "post_id": 42
}
```

Response (sem temas disponíveis):
```json
{
  "success": false,
  "message": "Nenhum tema pendente disponível para geração"
}
```

### POST `/api/cron/automation`

Requer header `Authorization: Bearer {CRON_SECRET}`.

Dispara `runAutomationCycle(false)` — respeita o intervalo configurado. Se ainda não for hora, retorna:
```json
{
  "success": false,
  "skipped": true,
  "message": "Ainda não está na hora de executar"
}
```

---

## Dependências

- **`lib/ai.ts`** — `aiChat()`, `callOpenRouterImage()`, `getPromptFromDB()` — toda IA passa pelo OpenRouter
- **`lib/slug.ts`** — `generateSlug()` para gerar slugs únicos (com sufixo `Date.now()`)
- **`lib/supabase-admin.ts`** — `supabaseAdmin` + `STORAGE_BUCKET` para upload da imagem
- **`drizzle/schema.ts`** — Tabelas `posts`, `automationConfig`, `articleThemes`, `siteSettings`
- **`sanitize-html`** — Sanitização do HTML gerado pela IA antes de persistir

---

## Prompt para Replicar em Outro Projeto

Use o prompt abaixo para implementar a mesma funcionalidade em qualquer projeto Next.js com Drizzle ORM e integração OpenRouter:

```
## Contexto

Tenho um blog Next.js 14 (App Router) com:
- TypeScript + Tailwind CSS
- Drizzle ORM + PostgreSQL (Supabase)
- Integração com IA via OpenRouter através de lib/ai.ts que exporta:
  - aiChat(feature, messages, options?) → Promise<string>
  - callOpenRouterImage(prompt) → Promise<string> (URL ou base64)
  - getPromptFromDB(key) → Promise<string>
- Tabela `posts` (id, title, slug, content, excerpt, cover_image, status ['draft'|'published'], published_at, created_at, updated_at)
- Tabela `article_themes` (id, title, description, source, status ['pending'|'used'], created_at)
- Tabela `site_settings` (key, value, updated_at) — armazena briefing da empresa em `briefing_content`
- Supabase Storage com bucket 'uploads' para imagens (via lib/supabase-admin.ts que exporta supabaseAdmin e STORAGE_BUCKET)
- Função generateSlug(title) em lib/slug.ts
- Sanitização HTML com sanitize-html
- Middleware JWT que protege /api/admin/* e /admin/* automaticamente (não protege /api/cron/*)
- Painel admin com seção de Artigos que tem uma subsection de Automação mostrando um placeholder "Em breve"

## O que preciso

Implemente um sistema completo de automação de posts com IA.

### 1. Banco de dados

Adicione a tabela `automation_config` no schema Drizzle:
- id (serial PK)
- enabled (boolean, default false)
- interval_hours (integer, default 24)
- theme_ids (text, default '[]') — JSON array de IDs de temas selecionados
- custom_prompt (text, nullable) — prompt adicional injetado na geração
- last_run_at (timestamp, nullable)
- next_run_at (timestamp, nullable)
- created_at / updated_at (timestamp, default now())

Exporte os tipos AutomationConfig e NewAutomationConfig.
Execute npm run db:generate e npm run db:migrate.

### 2. lib/automation.ts

Crie com duas exportações:

**getOrCreateAutomationConfig()** — busca a única linha da tabela ou cria com defaults se não existir.

**runAutomationCycle(force = false): Promise<AutomationResult>** com o seguinte pipeline:
1. Carregar config via getOrCreateAutomationConfig()
2. Se !enabled → retornar { success: false, skipped: true, message: 'Automação desabilitada' }
3. Se !force && next_run_at && new Date() < new Date(next_run_at) → retornar { success: false, skipped: true }
4. Selecionar tema: se theme_ids (JSON.parse, com try/catch fallback []) não estiver vazio, filtrar por esses IDs com status='pending'; senão, pegar qualquer pending. Ordenar por created_at ASC, limit 1.
5. Se nenhum tema → retornar { success: false, message: 'Nenhum tema pendente disponível para geração' }
6. Buscar briefing_content de site_settings
7. Montar prompt com tema + briefing como contexto + custom_prompt como instruções adicionais
8. Chamar aiChat('content_generation', messages, { temperature: 0.7, max_tokens: 4096 })
9. Fazer JSON.parse do resultado (com try/catch)
10. Gerar slug com generateSlug(title) + '-' + Date.now() (sufixo evita conflitos)
11. Sanitizar HTML com sanitize-html
12. Inserir post com status: 'draft'
13. Gerar imagem de capa (em bloco try/catch — falha é não-fatal):
    a. Buscar template de prompt em getPromptFromDB('image')
    b. Chamar aiChat('image_description', ...) para gerar prompt em inglês
    c. Chamar callOpenRouterImage(prompt)
    d. Se URL: fetch + arrayBuffer; se base64: extrair buffer
    e. Upload para Supabase Storage com nome auto-{timestamp}-{random}.{ext}
    f. Guardar public URL
14. Atualizar post: cover_image, status='published', published_at=now()
15. Marcar tema como status='used'
16. Atualizar automation_config: last_run_at=now(), next_run_at=now()+interval_hours*3600000
17. Retornar { success: true, message: '...', post_id }

AutomationResult: { success: boolean; message: string; post_id?: number; skipped?: boolean }

### 3. API Routes

**app/api/admin/automation/route.ts** (protegido pelo middleware JWT automaticamente):
- GET: retornar { enabled, interval_hours, theme_ids (JSON.parse com try/catch), custom_prompt, last_run_at, next_run_at }
- PUT: receber { enabled, interval_hours, theme_ids, custom_prompt }. Clampar interval_hours com Math.max(1, Math.min(8760, Number(v) || 24)). Ao habilitar, recalcular next_run_at = now() + hours. Fazer JSON.stringify dos theme_ids.

**app/api/admin/automation/run/route.ts** (protegido pelo middleware JWT automaticamente):
- POST: chamar runAutomationCycle(true) com force=true
- Exportar maxDuration = 60

**app/api/cron/automation/route.ts** (FORA de /api/admin/, não protegido pelo middleware):
- POST: verificar Authorization: Bearer {process.env.CRON_SECRET}
- IMPORTANTE: usar lógica de deny-by-default: if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) → 401
- Chamar runAutomationCycle(false)
- Exportar maxDuration = 60

### 4. vercel.json

Criar na raiz do projeto:
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

### 5. .env.example

Documentar: CRON_SECRET=seu-segredo-cron-aqui

### 6. UI — AutomacaoSection

Substituir o placeholder na seção de Automação do painel admin por um componente com:

**Ao montar:**
- Fetch GET /api/admin/automation → preencher todos os estados
- Fetch GET /api/admin/themes → preencher lista de temas

**Elementos:**
- Toggle pill (enabled/disabled) com visual brand-primary quando ativo
- Select de intervalo com opções: 4h, 8h, 12h, 24h, 2 dias, 7 dias
- Radio "Todos os temas pendentes" vs "Selecionar temas específicos"
- Quando "específicos": lista scrollável (max-h-48) com checkbox por tema, mostrando título, descrição e badge de status
- Textarea para prompt adicional (opcional)
- Bloco de status mostrando última execução e próxima execução formatadas em pt-BR
- Botão "Executar agora" → POST /api/admin/automation/run (force) com spinner
- Botão "Salvar Configuração" → PUT /api/admin/automation
- Ambos os botões desabilitados enquanto o outro está carregando
- Toast de sucesso/erro para cada operação
- Após salvar: re-fetch para atualizar next_run_at exibido
- Após executar: re-fetch para atualizar last_run_at e next_run_at

### Regras gerais
- Toda IA passa por lib/ai.ts (nunca direto para OpenRouter)
- O briefing de site_settings é o contexto central de qualidade
- O custom_prompt é injetado como seção "INSTRUÇÕES ADICIONAIS" no prompt
- Falha na imagem nunca deve impedir a publicação do artigo
- Slug com sufixo timestamp para evitar colisão em geração repetida do mesmo tema
- JSON.parse de campos texto do banco sempre com try/catch e fallback seguro
```
