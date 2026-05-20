# Fluxo de Criação de Artigos com IA

## Visão Geral

Implementação de um fluxo interativo via modais para criação de artigos que oferece ao usuário a escolha entre escrever manualmente ou usar IA. Quando IA é escolhido, o usuário pode optar por **Temas Sugeridos** (baseado nos temas cadastrados e briefing da empresa) ou **Link de Referência** (a IA lê um link e reescreve como artigo original).

---

## Funcionalidades

### Modal de Novo Artigo

Ao clicar em "+ Novo Artigo" na listagem de artigos, abre um modal com duas opções:

- **Manual** — Redireciona direto para a tela de edição vazia (`/admin/artigos/novo`)
- **Com IA** — Abre segundo nível com mais duas opções:
  - **Temas Sugeridos** — Lista os temas cadastrados na seção "Temas" do sistema, o usuário escolhe um, a IA sugere 5 artigos baseados no tema + briefing da empresa, o usuário escolhe um e a IA gera o artigo completo
  - **Link de Referência** — O usuário cola uma URL, o sistema lê o conteúdo do link, a IA reescreve como artigo original

Em ambos os casos de IA, o artigo é salvo como rascunho no banco e o usuário é redirecionado para a tela de edição com tudo preenchido.

### Contexto do Briefing

As APIs de sugestão e geração buscam automaticamente o briefing salvo em `site_settings` (chave `briefing_content`) e o enviam como contexto para a IA. Isso garante que os artigos sugeridos e gerados sejam relevantes para o negócio, produtos e público-alvo da empresa, e não genéricos.

---

## Arquivos Criados

### Componente do Modal

| Arquivo | Descrição |
|---------|-----------|
| `app/admin/artigos/NewArticleModal.tsx` | Modal com state machine que gerencia todo o fluxo (escolha método → tipo de IA → seleção de tema/link → geração → redirect) |

### Rotas de API

| Arquivo | Método | Descrição |
|---------|--------|-----------|
| `app/api/admin/ai/article/suggestions/route.ts` | POST | Recebe `{ theme, theme_description }`, busca o briefing, pede à IA 5 sugestões de artigos contextualizados |
| `app/api/admin/ai/article/generate/route.ts` | POST | Recebe `{ title, description }`, busca o briefing, gera artigo completo via IA, salva como rascunho no banco |
| `app/api/admin/ai/article/generate-from-url/route.ts` | POST | Recebe `{ url }`, faz fetch do conteúdo da URL, pede à IA para reescrever como artigo original, salva como rascunho |

---

## Arquivo Modificado

| Arquivo | Alteração |
|---------|-----------|
| `app/admin/artigos/ArtigosClient.tsx` | Botão "+ Novo Artigo" mudou de `<Link>` para `<button>` que abre o modal. Import do `NewArticleModal` e estado `showNewModal` |

---

## State Machine do Modal

```
method (Manual | IA)
  ├── Manual → router.push('/admin/artigos/novo')
  └── ai_type (Temas | Link)
       ├── select_theme (lista temas de article_themes)
       │    ├── loading_suggestions (chama /suggestions)
       │    │    └── select_suggestion (mostra 5 opções)
       │    │         └── generating (chama /generate)
       │    │              └── router.push('/admin/artigos/{id}/editar')
       │    │              └── erro → volta para select_suggestion
       │    │         └── voltar → select_theme
       │    └── erro → volta para select_theme
       └── enter_url (input + botão)
            └── generating (chama /generate-from-url)
                 └── router.push('/admin/artigos/{id}/editar')
                 └── erro → volta para enter_url
```

---

## Detalhes das APIs

### POST `/api/admin/ai/article/suggestions`

Request:
```json
{
  "theme": "Título do tema cadastrado",
  "theme_description": "Descrição opcional do tema"
}
```

Response:
```json
{
  "suggestions": [
    { "title": "Título do artigo sugerido", "description": "Breve descrição" },
    { "title": "...", "description": "..." }
  ]
}
```

Lógica:
1. Busca `briefing_content` em `site_settings`
2. Monta prompt com tema + descrição + briefing como contexto
3. Chama `aiChat('content_generation', ...)` com `max_tokens: 2048, temperature: 0.8`
4. Faz parse do JSON retornado pela IA

### POST `/api/admin/ai/article/generate`

Request:
```json
{
  "title": "Título escolhido",
  "description": "Descrição da sugestão"
}
```

Response:
```json
{ "post_id": 42 }
```

Lógica:
1. Busca `briefing_content` em `site_settings`
2. Monta prompt pedindo artigo HTML completo com briefing como contexto
3. Chama `aiChat('content_generation', ...)` com `max_tokens: 4096, temperature: 0.7`
4. Faz parse do JSON (title, excerpt, content)
5. Sanitiza o HTML com `sanitize-html`
6. Gera slug automático
7. Insere na tabela `posts` como `status: 'draft'`
8. Retorna o ID do post criado

### POST `/api/admin/ai/article/generate-from-url`

Request:
```json
{ "url": "https://exemplo.com/artigo-referencia" }
```

Response:
```json
{ "post_id": 43 }
```

Lógica:
1. Faz `fetch` da URL com timeout de 15s
2. Extrai texto limpo: remove `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`
3. Extrai blocos de `<p>`, `<h1-6>`, `<li>`, `<blockquote>` com conteúdo > 20 chars
4. Limita a 15.000 caracteres
5. Se conteúdo < 100 chars, retorna erro
6. Monta prompt pedindo artigo ORIGINAL (não cópia) baseado na referência
7. Chama `aiChat('content_generation', ...)` com `max_tokens: 4096, temperature: 0.8`
8. Salva como rascunho e retorna o ID

---

## Dependências

- **`lib/ai.ts`** — `aiChat()`, `getAIApiKey()`, `callOpenRouter()` (todas as chamadas de IA vão pelo OpenRouter)
- **`lib/slug.ts`** — `generateSlug()` para gerar slugs automáticos
- **`drizzle/schema.ts`** — Tabelas `posts`, `article_themes`, `site_settings`, `postCategories`
- **`sanitize-html`** — Sanitização do HTML gerado pela IA antes de persistir

---

## Prompt para Replicar em Outro Projeto

Use o prompt abaixo para implementar o mesmo fluxo em qualquer projeto Next.js com Drizzle ORM e integração OpenRouter:

```
## Contexto

Tenho um blog Next.js 14 (App Router) com:
- Drizzle ORM + PostgreSQL
- Integração com IA via OpenRouter (lib/ai.ts com aiChat(feature, messages, options))
- Tabela `posts` (id, title, slug, content, excerpt, cover_image, status, published_at, created_at, updated_at)
- Tabela `article_themes` (id, title, description, source, status, created_at) — temas cadastrados manualmente ou gerados por IA
- Tabela `site_settings` (key, value, updated_at) — armazena configurações incluindo briefing da empresa em `briefing_content`
- Tabela `post_categories` (post_id, category_id) — junção posts-categorias
- Página admin de listagem de artigos com botão "+ Novo Artigo" que atualmente é um <Link href="/admin/artigos/novo">
- Página de edição de artigo em /admin/artigos/[id]/editar que carrega o post por ID
- Função generateSlug(title) para gerar slugs
- Sanitização HTML com sanitize-html

## O que preciso

Altere o botão "+ Novo Artigo" para abrir um modal com as seguintes etapas:

### Etapa 1 — Escolha do método
Modal com 2 cards lado a lado:
- **Manual**: redireciona para /admin/artigos/novo
- **Com IA**: avança para etapa 2

### Etapa 2 — Tipo de criação com IA
Modal com 2 cards lado a lado:
- **Temas Sugeridos**: avança para etapa de seleção de tema
- **Link de Referência**: avança para etapa de input de URL

### Etapa 3a — Temas Sugeridos
1. Buscar temas da API GET /api/admin/themes (retorna { themes: ArticleTheme[] })
2. Listar temas cadastrados com título, descrição e badge de origem (IA/Manual)
3. Usuário escolhe um tema
4. Chamar POST /api/admin/ai/article/suggestions com { theme, theme_description }
5. Essa API deve buscar o briefing em site_settings (key: briefing_content) e enviar como contexto para a IA junto com o tema
6. Exibir as 5 sugestões retornadas ({ suggestions: [{ title, description }] })
7. Usuário escolhe uma sugestão
8. Chamar POST /api/admin/ai/article/generate com { title, description }
9. Essa API busca o briefing, gera artigo completo via IA, sanitiza HTML, salva como draft na tabela posts, retorna { post_id }
10. Redirecionar para /admin/artigos/{post_id}/editar

### Etapa 3b — Link de Referência
1. Input de URL + botão "Gerar Artigo"
2. Chamar POST /api/admin/ai/article/generate-from-url com { url }
3. Essa API faz fetch da URL, extrai texto limpo, pede à IA para reescrever como artigo original, sanitiza, salva como draft, retorna { post_id }
4. Redirecionar para /admin/artigos/{post_id}/editar

### Regras gerais
- Cada etapa tem botão "Voltar" (exceto loading e generating)
- Loading spinners durante chamadas assíncronas
- Exibir mensagens de erro quando chamadas falham
- Fechar modal ao clicar no backdrop ou no X
- Resetar estado ao abrir o modal
- A IA deve usar aiChat('content_generation', messages, { max_tokens, temperature })
- Toda IA passa por lib/ai.ts (OpenRouter), nunca diretamente
- O briefing é o contexto central: todas as chamadas de IA devem incluir o briefing para que o conteúdo seja relevante ao negócio da empresa
```
