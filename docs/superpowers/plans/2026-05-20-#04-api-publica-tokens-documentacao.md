# API Pública do Blog - Sistema Completo

**Data:** 2026-05-20
**Feature:** #04 - API pública com autenticação por tokens, documentação interativa e especificação OpenAPI

---

## Resumo

Implementação de uma API REST pública (v1) para o blog que permite integrações externas gerenciarem postagens, categorias e tags de forma programática. O sistema inclui geração e gerenciamento de tokens de acesso pelo painel administrativo, uma página pública de documentação interativa e um endpoint com especificação OpenAPI 3.1 para consumo por IAs.

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Modelo de Dados](#2-modelo-de-dados)
3. [Biblioteca de Autenticação](#3-biblioteca-de-autenticação)
4. [Rotas da API Admin (Gerenciamento de Tokens)](#4-rotas-da-api-admin-gerenciamento-de-tokens)
5. [Rotas da API Pública v1](#5-rotas-da-api-pública-v1)
6. [Página Admin de Gerenciamento de API](#6-página-admin-de-gerenciamento-de-api)
7. [Item no Menu Lateral do Admin](#7-item-no-menu-lateral-do-admin)
8. [Página Pública de Documentação](#8-página-pública-de-documentação)
9. [Especificação OpenAPI (download para IA)](#9-especificação-openapi-download-para-ia)
10. [Atalhos na Página de Configurações](#10-atalhos-na-página-de-configurações)
11. [Fluxo Completo de Uso](#11-fluxo-completo-de-uso)
12. [Segurança](#12-segurança)
13. [Estrutura de Arquivos](#13-estrutura-de-arquivos)
14. [Prompt para Replicar em Outro Projeto](#14-prompt-para-replicar-em-outro-projeto)

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     Painel Admin (/admin/api)                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Criar/Ativar/Desativar/Excluir Tokens de API           ││
│  │  Link para documentação (/docs)                         ││
│  │  Link para download OpenAPI JSON                        ││
│  └──────────────────────────┬──────────────────────────────┘│
└─────────────────────────────┼───────────────────────────────┘
                              │ CRUD tokens
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            API Admin (/api/admin/api-tokens)                 │
│  Protegida pelo middleware existente (cookie JWT)            │
│  GET / POST / PATCH / DELETE                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│            API Pública v1 (/api/v1/*)                        │
│  Protegida por Bearer Token (header Authorization)           │
│                                                              │
│  /api/v1/posts       → GET (listar) / POST (criar)          │
│  /api/v1/posts/{id}  → GET / PUT / DELETE                   │
│  /api/v1/categories  → GET (listar) / POST (criar)          │
│  /api/v1/categories/{id} → GET / PUT / DELETE               │
│  /api/v1/tags        → GET (listar) / POST (criar)          │
│  /api/v1/tags/{id}   → GET / PUT / DELETE                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ /docs        │ │ /api/v1/docs │ │ /admin/configuracoes │
│ Página HTML  │ │ OpenAPI JSON │ │ Seção API com links  │
│ interativa   │ │ p/ download  │ │ para docs e tokens    │
└──────────────┘ └──────────────┘ └──────────────────────┘
```

**Ponto importante:** As rotas `/api/v1/*` **não** passam pelo middleware de autenticação JWT (que só age em `/admin/:path*` e `/api/admin/:path*`). A autenticação da API v1 é feita internamente em cada rota, verificando o Bearer Token contra a tabela `api_tokens` no banco de dados.

---

## 2. Modelo de Dados

### Tabela `api_tokens`

Adicionada ao `drizzle/schema.ts`:

```typescript
export const apiTokens = pgTable('api_tokens', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),                              // Nome descritivo do token
  token: text('token').unique().notNull(),                   // O token em si (mma_xxxx...)
  active: text('active').notNull().default('true'),          // "true" ou "false"
  last_used_at: timestamp('last_used_at'),                   // Última vez que foi usado
  created_at: timestamp('created_at').notNull().default(sql`now()`),
})

export type ApiToken = typeof apiTokens.$inferSelect
export type NewApiToken = typeof apiTokens.$inferInsert
```

**SQL equivalente:**

```sql
CREATE TABLE IF NOT EXISTS api_tokens (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  active TEXT NOT NULL DEFAULT 'true',
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

**Decisões de design:**

- O campo `active` usa `text` com valores `'true'`/`'false'` em vez de `boolean` para seguir o padrão do projeto (a tabela `site_settings` já usa text para valores).
- O campo `token` tem constraint `UNIQUE` para garantir que não haja colisões.
- O campo `last_used_at` é atualizado a cada requisição autenticada, permitindo ao admin ver quais tokens estão em uso.

---

## 3. Biblioteca de Autenticação

Arquivo: `lib/api-auth.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { apiTokens } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

export async function verifyApiToken(request: NextRequest): Promise<
  { valid: true; tokenId: number } | { valid: false; response: NextResponse }
> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Token de API ausente. Envie o header Authorization: Bearer <token>' },
        { status: 401 }
      ),
    }
  }

  const [found] = await db.select().from(apiTokens).where(eq(apiTokens.token, token)).limit(1)

  if (!found || found.active !== 'true') {
    return {
      valid: false,
      response: NextResponse.json({ error: 'Token de API inválido ou desativado' }, { status: 401 }),
    }
  }

  // Atualiza last_used_at para rastrear uso do token
  await db
    .update(apiTokens)
    .set({ last_used_at: new Date() })
    .where(eq(apiTokens.id, found.id))

  return { valid: true, tokenId: found.id }
}

export function generateApiToken(): string {
  return `mma_${crypto.randomBytes(32).toString('hex')}`
}
```

**Como funciona:**

1. Extrai o token do header `Authorization: Bearer <token>`
2. Busca o token no banco de dados
3. Verifica se existe e está ativo (`active === 'true'`)
4. Se válido, atualiza o `last_used_at` e retorna `{ valid: true, tokenId }`
5. Se inválido, retorna `{ valid: false, response: NextResponse com 401 }`

**Padrão de uso em cada rota:**

```typescript
export async function GET(request: NextRequest) {
  const auth = await verifyApiToken(request)
  if (!auth.valid) return auth.response
  // ... lógica do endpoint
}
```

O token gerado tem o prefixo `mma_` seguido de 64 caracteres hexadecimais (256 bits de entropia), o que é mais que suficiente para segurança criptográfica.

---

## 4. Rotas da API Admin (Gerenciamento de Tokens)

Essas rotas são protegidas pelo middleware JWT existente (cookie `auth_token`), igual a todas as outras rotas `/api/admin/*`.

### `app/api/admin/api-tokens/route.ts`

**GET** - Lista todos os tokens ordenados por data de criação (mais recentes primeiro).

Resposta:
```json
{
  "tokens": [
    {
      "id": 1,
      "name": "Integração Mobile",
      "token": "mma_a1b2c3d4...",
      "active": "true",
      "last_used_at": "2024-01-20T15:30:00Z",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**POST** - Cria um novo token.

Body:
```json
{
  "name": "Nome descritivo do token"
}
```

Resposta (201):
```json
{
  "token": {
    "id": 2,
    "name": "Nome descritivo do token",
    "token": "mma_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "active": "true",
    "last_used_at": null,
    "created_at": "2024-01-20T16:00:00Z"
  }
}
```

### `app/api/admin/api-tokens/[id]/route.ts`

**PATCH** - Ativa ou desativa um token.

Body:
```json
{
  "active": false
}
```

**DELETE** - Exclui um token permanentemente.

---

## 5. Rotas da API Pública v1

Todas as rotas abaixo exigem o header `Authorization: Bearer <token>`. A autenticação é feita chamando `verifyApiToken(request)` no início de cada handler.

### 5.1. Posts

#### `GET /api/v1/posts` — Listar posts

Parâmetros de query:

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `page` | integer | 1 | Número da página |
| `limit` | integer | 10 | Itens por página (máx: 50) |
| `status` | string | `published` | `draft`, `published` ou `all` |

Resposta:
```json
{
  "posts": [...],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

#### `POST /api/v1/posts` — Criar post

Body:
```json
{
  "title": "Título do post (obrigatório)",
  "slug": "titulo-opcional",
  "content": "<p>Conteúdo HTML</p>",
  "excerpt": "Resumo do post",
  "cover_image": "https://exemplo.com/imagem.jpg",
  "status": "draft",
  "category_ids": [1, 2],
  "tag_ids": [3]
}
```

- O `slug` é gerado automaticamente a partir do `title` se não informado.
- O `content` HTML é sanitizado com `sanitize-html`.
- Se `status` for `"published"`, o campo `published_at` é definido automaticamente.

Resposta (201):
```json
{
  "post": {
    "id": 10,
    "title": "Título do post",
    "slug": "titulo-do-post",
    "content": "<p>Conteúdo HTML sanitizado</p>",
    "excerpt": "Resumo do post",
    "cover_image": "https://exemplo.com/imagem.jpg",
    "status": "draft",
    "published_at": null,
    "created_at": "2024-01-20T16:00:00Z",
    "updated_at": "2024-01-20T16:00:00Z"
  }
}
```

Erros: 400 (dados inválidos), 409 (slug já existe).

#### `GET /api/v1/posts/{id}` — Obter post por ID

Retorna o post com suas categorias e tags associadas:

```json
{
  "post": {
    "id": 10,
    "title": "...",
    "categories": [{ "id": 1, "name": "Tecnologia", "slug": "tecnologia", ... }],
    "tags": [{ "id": 3, "name": "JavaScript", "slug": "javascript", ... }]
  }
}
```

#### `PUT /api/v1/posts/{id}` — Atualizar post

Body (todos os campos opcionais):
```json
{
  "title": "Novo título",
  "status": "published",
  "category_ids": [1, 2, 3],
  "tag_ids": [5]
}
```

- Ao publicar um post pela primeira vez (que era draft), `published_at` é definido automaticamente.
- Se `category_ids` ou `tag_ids` forem enviados, as associações anteriores são removidas e recriadas.

#### `DELETE /api/v1/posts/{id}` — Excluir post

Resposta:
```json
{ "success": true }
```

### 5.2. Categorias

#### `GET /api/v1/categories` — Listar categorias

Retorna todas ordenadas por nome.

#### `POST /api/v1/categories` — Criar categoria

Body:
```json
{
  "name": "Tecnologia (obrigatório)",
  "slug": "tecnologia (opcional)",
  "description": "Artigos sobre tecnologia (opcional)"
}
```

#### `GET /api/v1/categories/{id}` — Obter categoria por ID

#### `PUT /api/v1/categories/{id}` — Atualizar categoria

Body (todos opcionais):
```json
{
  "name": "Novo nome",
  "slug": "novo-slug",
  "description": "Nova descrição"
}
```

#### `DELETE /api/v1/categories/{id}` — Excluir categoria

Não é possível excluir categorias que possuem posts associados (erro 409).

### 5.3. Tags

#### `GET /api/v1/tags` — Listar tags

Retorna todas ordenadas por nome.

#### `POST /api/v1/tags` — Criar tag

Body:
```json
{
  "name": "JavaScript (obrigatório)",
  "slug": "javascript (opcional)"
}
```

#### `GET /api/v1/tags/{id}` — Obter tag por ID

#### `PUT /api/v1/tags/{id}` — Atualizar tag

Body (todos opcionais):
```json
{
  "name": "Novo nome",
  "slug": "novo-slug"
}
```

#### `DELETE /api/v1/tags/{id}` — Excluir tag

---

## 6. Página Admin de Gerenciamento de API

Arquivo: `app/admin/api/page.tsx`

Componente client-side (`'use client'`) com as seguintes funcionalidades:

1. **Criar token** — Input com nome descritivo + botão "Gerar Token". Após criar, o token é exibido uma única vez com aviso para copiar.

2. **Listar tokens** — Tabela com colunas: Nome, Token (mascarado), Status, Último uso, Criado em, Ações.

3. **Ativar/Desativar** — Botão toggle que envia PATCH para `/api/admin/api-tokens/{id}`.

4. **Excluir** — Botão com confirmação que envia DELETE.

5. **Copiar token** — Botão para copiar token recém-criado para o clipboard.

6. **Link para documentação** — Botão no header que abre `/docs` em nova aba.

7. **Seção "Como usar"** — Instruções básicas com exemplo de header de autenticação.

**Interface visual:**

- Segue o mesmo padrão das outras páginas admin (cards brancos com borda, tailwind, componentes `<Button>`).
- Toasts de sucesso/erro com auto-dismiss de 4 segundos.
- Badge visual de status (verde "Ativo" / vermelho "Inativo").

---

## 7. Item no Menu Lateral do Admin

Arquivo: `app/admin/layout.tsx`

Adicionado ao array `navItems`:

```typescript
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/artigos', label: 'Artigos', icon: '📝' },
  { href: '/admin/categorias', label: 'Categorias', icon: '🗂️' },
  { href: '/admin/tags', label: 'Tags', icon: '🏷️' },
  { href: '/admin/api', label: 'API', icon: '🔑' },          // ← NOVO
  { href: '/admin/aparencia', label: 'Aparência', icon: '🎨' },
  { href: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' },
]
```

Posicionado antes de "Aparência", após "Tags".

---

## 8. Página Pública de Documentação

Arquivos: `app/docs/page.tsx` (server) + `app/docs/ApiDocsClient.tsx` (client)

Página pública acessível em `/docs` (não requer autenticação).

**Funcionalidades:**

1. **Header** com URL base dinâmica (usa `window.location.origin`), botão para baixar OpenAPI JSON e link para gerenciar tokens.

2. **Seção de Autenticação** — Explica o formato do header `Authorization: Bearer <token>` com exemplo em curl.

3. **Endpoints organizados por seção** — Posts, Categorias, Tags — cada seção é colapsável/expandível.

4. **Cada endpoint mostra:**
   - Badge com método HTTP (GET=verde, POST=azul, PUT=amarelo, DELETE=vermelho)
   - Path
   - Summary e description
   - Tabela de parâmetros (nome, local, tipo, obrigatório, descrição)
   - Exemplo de requisição curl (para métodos POST e PUT)
   - Badges de respostas HTTP (cores por faixa: 2xx=verde, 4xx=amarelo)

5. **Seção "Estrutura dos dados"** — Exemplos JSON de cada entidade (Post, Categoria, Tag).

6. **Seção "Download para IA"** — Explica como usar o arquivo OpenAPI JSON com IAs como ChatGPT, Claude, etc.

---

## 9. Especificação OpenAPI (download para IA)

Arquivo: `app/api/v1/docs/route.ts`

Endpoint `GET /api/v1/docs` que retorna uma especificação OpenAPI 3.1.0 completa em JSON.

**O que contém:**

- `info` — Título, descrição e versão da API
- `servers` — URL base dinâmica (lê `NEXT_PUBLIC_APP_URL`)
- `components.securitySchemes` — Esquema Bearer Auth
- `components.schemas` — Schemas para Post, PostWithRelations, PostInput, PostUpdate, Category, CategoryInput, CategoryUpdate, Tag, TagInput, TagUpdate, Error
- `paths` — Todos os 11 endpoints com parâmetros, request bodies e responses completas
- `security` — Requer BearerAuth globalmente

**Como usar com IAs:**

1. Baixe o arquivo em `/api/v1/docs` (salve como `openapi.json`)
2. No ChatGPT: envie o arquivo como anexo na conversa
3. No Claude: use o recurso de upload de arquivos ou cole o conteúdo
4. Em tools como Postman/Insomnia: importe como OpenAPI 3.1

A IA passará a conhecer todos os endpoints, parâmetros, schemas e poderá gerar código de integração corretamente.

---

## 10. Atalhos na Página de Configurações

Arquivo: `app/admin/configuracoes/ConfiguracoesClient.tsx`

Adicionada uma nova seção "API" no final do formulário, antes do botão de salvar, com 3 links:

1. **Gerenciar Tokens da API** → `/admin/api`
2. **Documentação da API** → `/docs` (abre em nova aba)
3. **Baixar OpenAPI JSON** → `/api/v1/docs` (download direto)

---

## 11. Fluxo Completo de Uso

### Criando e usando um token

```
1. Admin acessa /admin/api
2. Digita um nome (ex: "App Mobile") e clica "Gerar Token"
3. O sistema gera: mma_a1b2c3d4e5f6...
4. Admin copia o token (exibido apenas uma vez)
5. Desenvolvedor usa o token nas requisições:

   curl -X POST https://blog.com/api/v1/posts \
     -H "Authorization: Bearer mma_a1b2c3d4e5f6..." \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Meu primeiro post via API",
       "content": "<p>Conteúdo do post</p>",
       "status": "published",
       "category_ids": [1],
       "tag_ids": [1, 2]
     }'

6. O sistema valida o token, sanitiza o HTML e cria o post
7. last_used_at do token é atualizado automaticamente
```

### Revogando acesso

```
1. Admin acessa /admin/api
2. Clica "Desativar" no token desejado
3. Todas as requisições futuras com esse token recebem 401
4. Opcionalmente, pode clicar "Excluir" para remover permanentemente
```

---

## 12. Segurança

- **Tokens com 256 bits de entropia** — Prefixo `mma_` + 64 hex chars (impossível de adivinhar)
- **Token exibido apenas uma vez** — Após criar, só é mostrado no momento da criação. Na listagem, aparece mascarado.
- **Sanitização de HTML** — Todo conteúdo de post passado pela API é sanitizado com `sanitize-html`, igual ao painel admin.
- **Rate limiting indireto** — O middleware de rate limiting existente pode ser estendido para as rotas `/api/v1/*` se necessário.
- **Ativação/desativação instantânea** — Desativar um token invalida imediatamente todas as requisições.
- **Separação de autenticação** — A API v1 usa Bearer Token (independente do JWT do admin). O middleware JWT não interfere nas rotas `/api/v1/*`.

---

## 13. Estrutura de Arquivos

```
Arquivos criados:
├── lib/api-auth.ts                              # verifyApiToken() + generateApiToken()
├── app/api/admin/api-tokens/route.ts            # GET + POST tokens (admin)
├── app/api/admin/api-tokens/[id]/route.ts       # PATCH + DELETE tokens (admin)
├── app/api/v1/posts/route.ts                    # GET + POST posts (API pública)
├── app/api/v1/posts/[id]/route.ts               # GET + PUT + DELETE posts (API pública)
├── app/api/v1/categories/route.ts               # GET + POST categorias (API pública)
├── app/api/v1/categories/[id]/route.ts          # GET + PUT + DELETE categorias (API pública)
├── app/api/v1/tags/route.ts                     # GET + POST tags (API pública)
├── app/api/v1/tags/[id]/route.ts                # GET + PUT + DELETE tags (API pública)
├── app/api/v1/docs/route.ts                     # OpenAPI 3.1 JSON spec
├── app/admin/api/page.tsx                       # Página admin de gerenciamento
├── app/docs/page.tsx                            # Server wrapper da documentação
└── app/docs/ApiDocsClient.tsx                   # Página interativa de documentação

Arquivos modificados:
├── drizzle/schema.ts                            # + tabela apiTokens + tipos
├── app/admin/layout.tsx                         # + item "API" no navItems
└── app/admin/configuracoes/ConfiguracoesClient.tsx  # + seção "API" com atalhos
```

---

## 14. Prompt para Replicar em Outro Projeto

> **Prompt para implementar API pública com autenticação por tokens em um blog Next.js**
>
> ---
>
> Preciso implementar uma API REST pública no meu blog Next.js (App Router, TypeScript, Drizzle ORM, PostgreSQL). O sistema deve permitir que integrações externas gerenciem posts, categorias e tags via API usando tokens de acesso gerados pelo painel admin. Aqui está o que preciso:
>
> ### Requisitos
>
> **1. Tabela de tokens no banco de dados (Drizzle ORM)**
>
> Criar tabela `api_tokens` com: id (serial PK), name (text, not null), token (text, unique, not null), active (text not null default 'true'), last_used_at (timestamp nullable), created_at (timestamp default now()). O token deve ter formato `mma_` + 64 hex chars gerado com `crypto.randomBytes(32).toString('hex')`.
>
> **2. Biblioteca de autenticação (`lib/api-auth.ts`)**
>
> Função `verifyApiToken(request: NextRequest)` que:
> - Extrai token do header `Authorization: Bearer <token>`
> - Busca no banco pelo token
> - Verifica se existe e está ativo (`active === 'true'`)
> - Se válido, atualiza `last_used_at` e retorna `{ valid: true, tokenId }`
> - Se inválido, retorna `{ valid: false, response: NextResponse.json({...}, { status: 401 }) }`
>
> Função `generateApiToken()` que retorna `mma_` + 64 hex chars.
>
> **3. Rotas admin para gerenciar tokens (`/api/admin/api-tokens`)**
>
> Protegidas pelo middleware JWT existente. CRUD completo:
> - GET: listar tokens ordenados por data (mais recentes primeiro)
> - POST: criar token com `{ name: string }`
> - PATCH `/api/admin/api-tokens/{id}`: ativar/desativar com `{ active: boolean }`
> - DELETE `/api/admin/api-tokens/{id}`: excluir token
>
> **4. Rotas da API pública v1 (`/api/v1/*`)**
>
> Cada handler chama `verifyApiToken(request)` no início. Se `!auth.valid`, retorna `auth.response`. As rotas NÃO são protegidas pelo middleware de admin — a autenticação é por Bearer Token.
>
> **Posts:**
> - `GET /api/v1/posts` — Listar com paginação (`page`, `limit` max 50) e filtro por `status` (draft/published/all, default published)
> - `POST /api/v1/posts` — Criar com validação Zod. Campos: title (obrigatório), slug (auto-gerado), content (sanitizado com sanitize-html), excerpt, cover_image, status (draft/published), category_ids, tag_ids. Se status=published, definir published_at.
> - `GET /api/v1/posts/{id}` — Retornar com categorias e tags (JOIN nas tabelas post_categories e post_tags)
> - `PUT /api/v1/posts/{id}` — Atualizar. Se publicar pela primeira vez, definir published_at. category_ids e tag_ids substituem as associações existentes.
> - `DELETE /api/v1/posts/{id}` — Excluir permanentemente (cascade remove associações)
>
> **Categorias:**
> - `GET /api/v1/categories` — Listar ordenado por nome
> - `POST /api/v1/categories` — Criar com name (obrigatório), slug (auto), description
> - `GET /api/v1/categories/{id}` — Obter por ID
> - `PUT /api/v1/categories/{id}` — Atualizar
> - `DELETE /api/v1/categories/{id}` — Excluir (rejeitar se tiver posts associados, erro 409)
>
> **Tags:**
> - `GET /api/v1/tags` — Listar ordenado por nome
> - `POST /api/v1/tags` — Criar com name (obrigatório), slug (auto)
> - `GET /api/v1/tags/{id}` — Obter por ID
> - `PUT /api/v1/tags/{id}` — Atualizar
> - `DELETE /api/v1/tags/{id}` — Excluir
>
> **5. Página admin de gerenciamento (`app/admin/api/page.tsx`)**
>
> Componente client ('use client') com:
> - Input de nome + botão "Gerar Token"
> - Exibição única do token após criação (com aviso e botão copiar)
> - Tabela de tokens: Nome, Token (mascarado), Status (badge Ativo/Inativo), Último uso, Criado em, Ações (Desativar/Ativar + Excluir)
> - Toasts de sucesso/erro com auto-dismiss
> - Link para documentação (/docs)
> - Seção "Como usar" com exemplo de header Authorization
>
> **6. Item no menu lateral admin**
>
> Adicionar `{ href: '/admin/api', label: 'API', icon: '🔑' }` no array navItems do layout admin, entre Tags e Aparência.
>
> **7. Página pública de documentação (`/docs`)**
>
> Página interativa (não requer autenticação) com:
> - Header com URL base dinâmica (window.location.origin)
> - Seção de autenticação explicando o header Bearer
> - Endpoints organizados por seção colapsável (Posts, Categorias, Tags)
> - Cada endpoint: badge do método HTTP (cores distintas), path, summary, description, tabela de parâmetros, exemplo curl (para POST/PUT), badges de respostas HTTP
> - Seção com estrutura dos dados (exemplos JSON de cada entidade)
> - Seção "Download para IA" com botão para baixar OpenAPI JSON
>
> **8. Endpoint OpenAPI JSON (`GET /api/v1/docs`)**
>
> Retorna especificação OpenAPI 3.1.0 completa com: info, servers (URL dinâmica), components.securitySchemes (BearerAuth), components.schemas (todos os tipos), paths (todos os 11 endpoints com parâmetros, requestBodies e responses), security global.
>
> **9. Atalhos na página de configurações admin**
>
> Adicionar seção "API" na página de configurações com 3 links: Gerenciar Tokens (/admin/api), Documentação (/docs, target blank), Baixar OpenAPI JSON (/api/v1/docs, download).
>
> **10. Middleware**
>
> IMPORTANTE: As rotas `/api/v1/*` NÃO devem ser adicionadas ao matcher do middleware JWT existente. A autenticação delas é feita internamente via Bearer Token em cada handler, não via cookie JWT.
>
> ### Contexto do meu projeto
>
> - Next.js 14 App Router + TypeScript + Tailwind CSS
> - Drizzle ORM com PostgreSQL (Supabase)
> - Autenticação admin via JWT em cookie httpOnly (`auth_token`)
> - Middleware em `middleware.ts` que protege `/admin/:path*` e `/api/admin/:path*`
> - Componente `<Button>` com variantes (primary, secondary, ghost, danger) e loading
> - Slug auto-gerado via `lib/slug.ts` (strip diacritics, lowercase, hyphens)
> - Sanitização HTML com `sanitize-html`
> - Validação com `zod`
> - Posts com status `draft`/`published`, com `published_at` timestamp
> - Tabelas existentes: users, posts, categories, tags, post_categories, post_tags, site_settings
>
> Gere TODOS os arquivos necessários com o código completo, seguindo os padrões e convenções que já existem no projeto.

---

*Documentação gerada em 2026-05-20.*
