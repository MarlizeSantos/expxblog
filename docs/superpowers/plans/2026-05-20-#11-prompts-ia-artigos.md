# Prompts de IA Padrão para Geração de Artigos

## Visão Geral

Implementação da seção **Prompts de IA** dentro do sidebar de Artigos do painel administrativo. Permite cadastrar prompts padrão para 4 tipos de geração (títulos, artigos, CTA e imagens), com a possibilidade de gerar cada prompt automaticamente via IA com base no briefing do cliente.

---

## Funcionalidades

- **4 campos de prompt configurável**: Títulos, Artigos, CTA (Call to Action) e Imagens
- **Geração automática via IA**: Cada campo possui um botão com ícone de sparkle que envia o briefing do cliente para a LLM e recebe de volta um prompt otimizado
- **Persistência**: Prompts salvos no banco (`site_settings`, key `ai_default_prompts`) como JSON
- **Fallback inteligente**: Se não houver briefing cadastrado, a IA gera um prompt genérico; se houver, o prompt é personalizado para o negócio
- **Feedback visual**: Loading spinner individual por campo, toasts de sucesso/erro

---

## Arquivos Criados

| Arquivo | Descrição |
|---|---|
| `app/api/admin/prompts/route.ts` | API REST para CRUD de prompts (GET/PUT) |
| `app/api/admin/prompts/generate/route.ts` | API POST para gerar prompt via IA com base no briefing |

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `lib/ai.ts` | Adicionado `prompt_generation` ao `DEFAULT_MODELS` |
| `app/admin/artigos/ArtigosClient.tsx` | Substituído placeholder "prompts" pelo componente `PromptsSection` completo |

---

## Estrutura de Armazenamento

Os prompts são salvos na tabela `site_settings` com a chave `ai_default_prompts`:

```json
{
  "title": "Prompt para geração de títulos...",
  "article": "Prompt para geração de artigos completos...",
  "cta": "Prompt para geração de CTAs...",
  "image": "Prompt para geração de descrições de imagens..."
}
```

---

## API Routes

### GET `/api/admin/prompts`

Retorna os prompts cadastrados.

**Response:**
```json
{
  "prompts": {
    "title": "...",
    "article": "...",
    "cta": "...",
    "image": "..."
  }
}
```

### PUT `/api/admin/prompts`

Salva os prompts. Faz upsert na `site_settings`.

**Body:**
```json
{
  "title": "texto do prompt",
  "article": "texto do prompt",
  "cta": "texto do prompt",
  "image": "texto do prompt"
}
```

### POST `/api/admin/prompts/generate`

Gera um prompt automaticamente via IA com base no briefing do cliente.

**Body:**
```json
{
  "type": "title"
}
```

Tipos aceitos: `title`, `article`, `cta`, `image`

**Response:**
```json
{
  "prompt": "Texto do prompt gerado pela IA..."
}
```

**Comportamento:**
1. Lê `briefing_content` do `site_settings`
2. Se houver briefing, gera prompt personalizado para o negócio
3. Se não houver, gera prompt genérico
4. Usa a feature `prompt_generation` do módulo `lib/ai.ts`

---

## Componente UI: PromptsSection

Localizado em `app/admin/artigos/ArtigosClient.tsx`, o componente inclui:

- **4 textareas** com labels, descrições e placeholders contextuais
- **Botão "Gerar com IA"** em cada campo (ícone sparkle SVG + texto)
- **Loading spinner** individual por campo durante geração
- **Toast notifications** de sucesso/erro
- **Botão "Salvar Prompts"** no final

### Configuração dos campos (PROMPT_FIELDS)

| Key | Label | Rows | Descrição |
|---|---|---|---|
| `title` | Prompt para Títulos | 6 | Geração de títulos atrativos e otimizados para SEO |
| `article` | Prompt para Artigos | 8 | Geração de artigos completos com estrutura e SEO |
| `cta` | Prompt para CTA | 6 | Geração de chamadas para ação persuasivas |
| `image` | Prompt para Imagens | 6 | Geração de descrições detalhadas para geradores de imagem |

---

## Instruções de Geração por Tipo

Cada tipo de prompt possui instruções específicas enviadas à IA:

- **title**: Foco em títulos clicáveis, SEO (50-60 chars), variação de formatos (como fazer, listas, perguntas)
- **article**: Estrutura (intro/desenvolvimento/conclusão), subtítulos H2/H3, parágrafos curtos, SEO natural
- **cta**: Tipos variados (inscrição, download, contato), gatilhos mentais, texto conciso
- **image**: Detalhes visuais, contexto do artigo, estilo artístico, otimização para DALL-E/Midjourney

---

## Feature de IA Adicionada

Em `lib/ai.ts`, foi adicionada a feature `prompt_generation` ao mapa `DEFAULT_MODELS`:

```ts
prompt_generation: 'openai/gpt-4o-mini',
```

Isso permite que o modelo usado para gerar prompts possa ser alterado pelo admin em **Configurações > IA (OpenRouter)**.

---

## Prompt para Replicar esta Funcionalidade

Copie o prompt abaixo e cole em uma sessão do Claude Code / Cursor / Copilot para implementar esta funcionalidade em outro projeto:

---

> ## Prompt de Implementação: Sistema de Prompts de IA Padrão
>
> ### Contexto
>
> Tenho um blog Next.js 14 (App Router) com painel administrativo. A área de artigos (`app/admin/artigos/`) possui um sidebar com seções, usando state-based rendering (switch/case). A seção "Prompts de IA" atualmente é um placeholder e precisa ser implementada.
>
> ### Requisitos
>
> 1. **Criar 4 campos de prompt configurável** na seção "Prompts de IA" do sidebar de artigos:
>    - **Título** — prompt para gerar títulos de artigos
>    - **Artigo** — prompt para gerar artigos completos
>    - **CTA** — prompt para gerar chamadas para ação
>    - **Imagem** — prompt para gerar descrições de imagens
>
> 2. **Persistência**: Salvar os prompts na tabela `site_settings` (key-value) com chave `ai_default_prompts` como JSON: `{ "title": "...", "article": "...", "cta": "...", "image": "..." }`
>
> 3. **API Routes**:
>    - `GET /api/admin/prompts` — retorna os prompts salvos
>    - `PUT /api/admin/prompts` — salva/atualiza os prompts (upsert pattern)
>    - `POST /api/admin/prompts/generate` — recebe `{ "type": "title"|"article"|"cta"|"image" }` e usa IA para gerar o prompt automaticamente
>
> 4. **Geração via IA**: O endpoint de geração deve:
>    - Ler o briefing do cliente da `site_settings` (key `briefing_content`)
>    - Se houver briefing, gerar prompt personalizado para o negócio
>    - Se não houver briefing, gerar prompt genérico
>    - Usar a feature `prompt_generation` do módulo central de IA (`lib/ai.ts`)
>    - Cada tipo deve ter instruções específicas (títulos: SEO e copywriting; artigos: estrutura e formato; CTA: gatilhos mentais e persuasão; imagem: detalhes visuais e geradores de imagem)
>
> 5. **UI (React client component)**:
>    - Cada campo deve ter: label, descrição curta, textarea com placeholder, e um botão "Gerar com IA" com ícone de sparkle (SVG inline)
>    - Loading spinner individual por campo (não bloqueia outros campos)
>    - Toast notifications de sucesso/erro (estado local, sem biblioteca externa)
>    - Botão "Salvar Prompts" no final
>    - Seguir o padrão visual existente: `bg-white rounded-xl border border-gray-200 p-6`, inputs com `border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary`
>
> 6. **Módulo de IA**: Adicionar `prompt_generation: 'openai/gpt-4o-mini'` ao mapa de modelos padrão em `lib/ai.ts`. O sistema usa OpenRouter como gateway para todos os modelos de IA.
>
> ### Estrutura de Arquivos Esperada
>
> ```
> app/api/admin/prompts/
> ├── route.ts          # GET e PUT
> └── generate/
>     └── route.ts      # POST (geração via IA)
> 
> app/admin/artigos/
> └── ArtigosClient.tsx  # Adicionar componente PromptsSection
> 
> lib/
> └── ai.ts             # Adicionar prompt_generation ao DEFAULT_MODELS
> ```
>
> ### Padrões do Projeto
>
> - **ORM**: Drizzle ORM com PostgreSQL
> - **Site settings**: `upsert` pattern com `db.insert(...).onConflictDoUpdate(...)`
> - **AI calls**: Usar `aiChat(feature, messages, options)` de `lib/ai.ts` — resolve modelo e API key automaticamente
> - **Componentes**: Client components com `'use client'`, estado local com `useState`/`useEffect`
> - **Estilo**: Tailwind CSS, cores brand-primary/brand-secondary/neutral-900
> - **TypeScript**: Tipagem forte, sem `any`

---

## Dependências

- Módulo `lib/ai.ts` (funções `aiChat`, `getAIApiKey`, `getAIModelFromDB`)
- Tabela `site_settings` no banco de dados
- Briefing do cliente (opcional — key `briefing_content` em `site_settings`)
- Feature `prompt_generation` registrada no `DEFAULT_MODELS`
