# Design — Bloco de SEO & Descoberta

**Data:** 2026-06-04
**Status:** Aprovado, pronto para plano de implementação

## Objetivo

Fechar lacunas de SEO e descoberta do blog público que hoje não existem (ou estão quebradas), com baixo risco e alto retorno. Inclui a correção de um bug ativo: `app/robots.ts` aponta para `/sitemap.xml`, mas o sitemap não existe (404 hoje).

## Escopo (5 entregas)

Ordenadas da menor à maior dependência. Todas seguem os padrões existentes do projeto:
Server Components com Drizzle direto no público, `getAppUrl()`, `getSettings()`,
ícones Feather outline (`width/height 17`, `strokeWidth 1.75`), tokens de marca
(`brand-primary`, `brand-secondary`), nunca hex hardcoded no JSX.

### 1. Sitemap dinâmico — `app/sitemap.ts`

- Usa a convention `MetadataRoute.Sitemap` do Next 14 (mesmo estilo de `app/robots.ts`).
- Corrige o bug: `robots.ts` já referencia `${getAppUrl()}/sitemap.xml`.
- Inclui: home, todos os posts publicados (`lastModified = updated_at`), páginas de
  categoria (`/categoria/[slug]`) e de tag (`/tag/[slug]`).
- Query nova e isolada em `lib/db-queries.ts`: `getSitemapEntries()`. Nada inline.
- Só posts `status = 'published'`.

### 2. Campo de autor (texto simples)

Decisão: campo de texto simples, sem página de autor, sem bio/avatar, sem tabela de autores.

- **Schema** (`drizzle/schema.ts`): adiciona `author_name text` em `posts` —
  **nullable** (sem NOT NULL → migration segura em um passo).
- **Migration**: gerada via `npm run db:generate` + aplicada via `npm run db:migrate`.
- **Paridade tripla obrigatória**: produção NÃO usa `db:migrate` (atualiza via
  `DbUpdateModal`/setup-sql). Manter paridade **schema ⟺ embedded (`lib/db-migrations.ts`) ⟺ setup-sql**.
  Localizar e atualizar os três pontos para incluir `posts.author_name`.
- **API admin** (`/api/admin/posts`): aceitar e persistir `author_name` no create/update,
  validado com Zod. Erros em português, shape `{ error: string }`.
- **Editor admin**: input de texto no formulário de artigo. Placeholder/hint =
  "Deixe vazio para usar o nome do blog".
- **Render no artigo** (`app/(public)/[slug]/page.tsx`): linha "Por {autor}" no header.
  Fallback para `blog_name` (de `getSettings().company`) quando `author_name` vazio.

### 3. JSON-LD `BlogPosting` — `components/blog/ArticleJsonLd.tsx`

- `<script type="application/ld+json">` renderizado no `[slug]/page.tsx`.
- Campos: `@context`, `@type: BlogPosting`, `headline`, `description` (excerpt),
  `image` (cover_image), `datePublished` (published_at), `dateModified` (updated_at),
  `author` (`{ "@type": "Person", name: author_name ?? blog_name }`),
  `publisher` (`{ "@type": "Organization", name: blog_name, logo: { "@type": "ImageObject", url: logo_url } }`),
  `mainEntityOfPage` (URL canônica do post).
- Render via `dangerouslySetInnerHTML` com `JSON.stringify` — seguro, são dados
  estruturados, não HTML de usuário. (Ainda assim, escapar `<` para evitar quebra de tag.)

### 4. Posts relacionados — `components/blog/RelatedPosts.tsx`

- Query `getRelatedPosts(postId, categoryIds, tagIds, limit = 3)` em `lib/db-queries.ts`.
- Estratégia (categoria + recência): prioriza posts publicados da mesma categoria,
  ordenados por `published_at desc` → completa com posts que compartilham tag →
  completa com os mais recentes do blog. Sempre exclui o post atual e só `published`.
- Renderiza grid de cards reaproveitando o estilo dos `PostCard*` existentes.
- Aparece no fim do `[slug]/page.tsx`. Se não houver relacionados, não renderiza nada.

### 5. Compartilhamento social — `components/blog/ShareButtons.tsx`

- Client Component (`'use client'`) — precisa de `navigator.clipboard` e `window.location`.
- Redes: WhatsApp · X (Twitter) · LinkedIn · Facebook · copiar link.
- Links nativos de share (intents/URLs) — sem SDK externo, sem domínio novo no `next.config.js`.
- Ícones Feather outline, cores de marca.
- Botão "copiar link" dá feedback inline "Copiado!" (sem `alert()`).
- Posicionado no artigo (header e/ou fim).

## Fora de escopo (YAGNI — leva futura)

- Página de autor (`/autor/[slug]`), bio, avatar, tabela `authors`.
- OG image dinâmica (`@vercel/og`).
- Table of contents.
- Comentários.
- i18n.

## Arquivos

**Novos:**
- `app/sitemap.ts`
- `components/blog/ArticleJsonLd.tsx`
- `components/blog/RelatedPosts.tsx`
- `components/blog/ShareButtons.tsx`

**Alterados:**
- `drizzle/schema.ts` (coluna `author_name`)
- `lib/db-migrations.ts` (embedded — paridade)
- setup-sql (paridade — localizar arquivo/rota de setup)
- `lib/db-queries.ts` (`getSitemapEntries`, `getRelatedPosts`)
- `app/(public)/[slug]/page.tsx` (autor, JSON-LD, relacionados, share)
- `app/api/admin/posts/route.ts` (persistir `author_name`)
- Editor do admin (input de autor)

## Critérios de sucesso

- `GET /sitemap.xml` retorna 200 com XML válido contendo posts/categorias/tags.
- Post renderiza `<script type="application/ld+json">` válido (testável no Rich Results Test do Google).
- Editor salva e exibe autor; artigo mostra "Por {autor}" com fallback para nome do blog.
- Fim do artigo mostra até 3 posts relacionados relevantes.
- Botões de share geram URLs corretas; "copiar link" funciona.
- `npm run build` e `npm run lint` passam.
- Paridade de schema mantida (migration local + embedded + setup-sql).
