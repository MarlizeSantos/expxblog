# Template "News" — Documentação Completa

**Data de implementação:** 2026-05-20  
**Inspiração:** [TechTudo.com.br](https://www.techtudo.com.br/)  
**Commits:** `96e0535` → `f0d43b1` (10 commits)

---

## O que foi criado

Um 4º template de layout para o blog, no estilo de portal de notícias. Quando ativo, transforma a página inicial em um portal com posts agrupados por categoria e sidebar de destaques.

### Arquivos criados

| Arquivo | Tipo | Responsabilidade |
|---|---|---|
| `components/layout/NewsHeader.tsx` | Server Component (async) | Header de duas linhas: linha branca (logo + busca) + linha colorida (links de categorias) |
| `components/blog/PostCardNews.tsx` | Client-safe Component | Card de post em dois formatos: `card` (vertical, para grid) e `mini` (horizontal numerado, para sidebar) |
| `components/blog/CategorySection.tsx` | Client-safe Component | Seção com título de categoria, borda lateral colorida, grid de 3 cards e link "Ver mais →" |
| `components/blog/NewsSidebar.tsx` | Server Component (async) | Sidebar com "Destaques" (5 posts mais recentes numerados) e nuvem de tags |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `lib/settings.ts` | Adicionado `news` em `COLOR_DEFAULTS` com cores `#003580` / `#E8002D` |
| `app/(public)/layout.tsx` | Import de `NewsHeader` + branch 4-way no switch de headers + `max-w-7xl` inclui `news` |
| `app/(public)/page.tsx` | Função `getNewsSections()` + branch `if (template === 'news')` |
| `app/api/admin/settings/route.ts` | `z.enum([..., 'news'])` no schema Zod |
| `app/admin/aparencia/ApparenceClient.tsx` | Entrada `news` no `TEMPLATE_OPTIONS` (com SVG preview) e em `DEFAULT_COLORS` |

---

## Arquitetura e decisões técnicas

### Cores dinâmicas com CSS Variables

O template usa `var(--color-primary)` e `var(--color-secondary)` diretamente em `style={{ ... }}` inline, não classes Tailwind hardcoded. Isso permite que o admin troque as cores sem redeployar.

```tsx
// Correto — responde às cores configuradas no admin
<div style={{ backgroundColor: 'var(--color-primary)' }} />

// Evitado — cor fixa que não responde ao tema
<div className="bg-blue-800" />
```

### Data fetching direto no DB (sem API HTTP)

O template `news` busca dados diretamente via Drizzle ORM, sem passar pelo `/api/posts`. Isso evita N round-trips HTTP desnecessários e funciona bem em Server Components.

```ts
// getNewsSections() em page.tsx
const cats = await db.select().from(categories).orderBy(asc(categories.name))
const sections = await Promise.all(
  cats.map(async (cat) => {
    const rows = await db
      .select({ post: posts })
      .from(posts)
      .innerJoin(postCategories, eq(postCategories.post_id, posts.id))
      .where(and(eq(posts.status, 'published'), eq(postCategories.category_id, cat.id)))
      .orderBy(desc(posts.published_at))
      .limit(3)
    // ...
  })
)
```

### Serialização de datas

Drizzle retorna `published_at: Date | null`. Os componentes de card esperam `string | null`. A conversão é feita na camada de dados:

```ts
published_at: p.published_at?.toISOString() ?? null,
```

### Layout da página inicial

```
┌──────────────────────────────────────────────────────┐
│  [logo]  [blogName]                    [🔍 search]   │  ← linha branca
│  Início  | Categoria1 | Categoria2 | Categoria3       │  ← linha colorida
└──────────────────────────────────────────────────────┘

┌─────────────────────────────────┐ ┌────────────────┐
│ ▌ CATEGORIA A           Ver mais│ │ ▌ DESTAQUES     │
│ ┌──────┐ ┌──────┐ ┌──────┐     │ │ ① [img] Título  │
│ │ img  │ │ img  │ │ img  │     │ │ ② [img] Título  │
│ └──────┘ └──────┘ └──────┘     │ │ ③ [img] Título  │
│                                 │ │ ④ [img] Título  │
│ ▌ CATEGORIA B           Ver mais│ │ ⑤ [img] Título  │
│ ┌──────┐ ┌──────┐ ┌──────┐     │ │                 │
│ │ img  │ │ img  │ │ img  │     │ │ ▌ TAGS          │
│ └──────┘ └──────┘ └──────┘     │ │ [tag] [tag]     │
└─────────────────────────────────┘ └────────────────┘
```

---

## Código completo dos arquivos criados

### `components/layout/NewsHeader.tsx`

```tsx
import Link from 'next/link'
import { SearchBar } from '@/components/blog/SearchBar'
import { db } from '@/drizzle/db'
import { categories } from '@/drizzle/schema'
import { asc } from 'drizzle-orm'

async function getCategories() {
  try {
    return db.select().from(categories).orderBy(asc(categories.name))
  } catch {
    return []
  }
}

interface Props {
  blogName: string
  logoUrl?: string
}

export async function NewsHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="sticky top-0 z-40 shadow-sm">
      {/* Row 1: white — logo + search */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
            {logoUrl && <img src={logoUrl} alt="" className="h-8 w-auto" />}
            <span
              className="text-lg font-bold tracking-tight whitespace-nowrap"
              style={{ color: 'var(--color-primary)' }}
            >
              {blogName}
            </span>
          </Link>
          <div className="w-full max-w-sm">
            <SearchBar variant="light" />
          </div>
        </div>
      </div>

      {/* Row 2: primary color — category nav */}
      <div style={{ backgroundColor: 'var(--color-primary)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-bold text-white whitespace-nowrap hover:bg-white/10 transition-colors border-b-2 border-transparent hover:border-white/50"
            >
              Início
            </Link>
            {cats.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="px-4 py-2 text-sm font-medium text-white/80 whitespace-nowrap hover:text-white hover:bg-white/10 transition-colors border-b-2 border-transparent hover:border-white/50"
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
```

### `components/blog/PostCardNews.tsx`

```tsx
import Link from 'next/link'
import { estimateReadingTime } from '@/lib/reading-time'

interface Post {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  published_at: string | null
  categories: { id: number; name: string; slug: string }[]
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  post: Post
  variant?: 'card' | 'mini'
  rank?: number
}

export function PostCardNews({ post, variant = 'card', rank }: Props) {
  const readTime = estimateReadingTime(post.content)
  const firstCategory = post.categories[0]

  if (variant === 'mini') {
    return (
      <Link
        href={`/${post.slug}`}
        className="group flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-1 rounded"
      >
        {rank !== undefined && (
          <span
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {rank}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug group-hover:opacity-70">
            {post.title}
          </h4>
          <p className="text-xs text-gray-400 mt-1">{formatDate(post.published_at)}</p>
        </div>
        {post.cover_image && (
          <img src={post.cover_image} alt="" className="w-16 h-11 object-cover rounded shrink-0" />
        )}
      </Link>
    )
  }

  return (
    <Link
      href={`/${post.slug}`}
      className="group bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow block border border-gray-100"
    >
      <div className="aspect-[16/9] overflow-hidden">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>
      <div className="p-3">
        {firstCategory && (
          <span
            className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
            style={{ color: 'var(--color-secondary)' }}
          >
            {firstCategory.name}
          </span>
        )}
        <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2 group-hover:opacity-70">
          {post.title}
        </h3>
        <p className="text-xs text-gray-400 mt-2">
          {formatDate(post.published_at)} · {readTime} min de leitura
        </p>
      </div>
    </Link>
  )
}
```

### `components/blog/CategorySection.tsx`

```tsx
import Link from 'next/link'
import { PostCardNews } from '@/components/blog/PostCardNews'

interface Post {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  published_at: string | null
  categories: { id: number; name: string; slug: string }[]
}

interface Category {
  id: number
  name: string
  slug: string
}

interface Props {
  category: Category
  posts: Post[]
}

export function CategorySection({ category, posts }: Props) {
  if (posts.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-5 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">
            {category.name}
          </h2>
        </div>
        <Link
          href={`/categoria/${category.slug}`}
          className="text-xs font-semibold uppercase tracking-wide transition-opacity hover:opacity-60"
          style={{ color: 'var(--color-primary)' }}
        >
          Ver mais →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {posts.map((post) => (
          <PostCardNews key={post.id} post={post} variant="card" />
        ))}
      </div>
    </section>
  )
}
```

### `components/blog/NewsSidebar.tsx`

```tsx
import Link from 'next/link'
import { PostCardNews } from '@/components/blog/PostCardNews'
import { db } from '@/drizzle/db'
import { posts, postCategories, categories, tags } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'

async function getRecentPosts() {
  try {
    const recent = await db
      .select()
      .from(posts)
      .where(eq(posts.status, 'published'))
      .orderBy(desc(posts.published_at))
      .limit(5)

    return Promise.all(
      recent.map(async (p) => {
        const catRows = await db
          .select({ category: categories })
          .from(postCategories)
          .innerJoin(categories, eq(categories.id, postCategories.category_id))
          .where(eq(postCategories.post_id, p.id))
          .limit(1)
        return {
          ...p,
          published_at: p.published_at?.toISOString() ?? null,
          categories: catRows.map((r) => r.category),
        }
      })
    )
  } catch {
    return []
  }
}

async function getAllTags() {
  try {
    return db.select().from(tags).limit(20)
  } catch {
    return []
  }
}

export async function NewsSidebar() {
  const [recentPosts, allTags] = await Promise.all([getRecentPosts(), getAllTags()])

  return (
    <aside className="space-y-8">
      {recentPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-1 h-5 rounded-full"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            />
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">
              Destaques
            </h2>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 px-3 py-1">
            {recentPosts.map((post, i) => (
              <PostCardNews key={post.id} post={post} variant="mini" rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {allTags.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-1 h-5 rounded-full"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            />
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-widest">Tags</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
```

---

## Como ativar

1. Acesse `/admin/aparencia`
2. Selecione o template **News**
3. Clique em **Salvar alterações**
4. Recarregue o blog público

As cores padrão são azul profundo `#003580` (primária) e vermelho `#E8002D` (destaque), mas podem ser personalizadas na mesma tela.

---

## Prompt para implementar em outro projeto

Use este prompt para replicar o template News em outro projeto Next.js 14 com App Router, Tailwind CSS e Drizzle ORM, que já tenha um sistema de templates similar (com CSS variables `--color-primary` e `--color-secondary` definidas no layout raiz):

---

```
Preciso que você implemente um template "News" estilo portal de notícias (inspirado no TechTudo.com.br) neste projeto Next.js 14 com App Router, Tailwind CSS e Drizzle ORM.

O projeto já tem:
- Um sistema de templates com CSS variables `--color-primary` e `--color-secondary` definidas no layout
- Tabelas no banco: `posts` (com campos id, title, slug, content, excerpt, cover_image, status, published_at), `categories` (id, name, slug), `post_categories` (post_id, category_id), `tags` (id, name, slug)
- Uma função `estimateReadingTime(html: string): number` em `lib/reading-time.ts`
- Um componente `SearchBar` com prop `variant?: 'dark' | 'light'`
- Um sistema de seleção de template no admin (objeto TEMPLATE_OPTIONS e DEFAULT_COLORS)

O que precisa ser criado:

**1. `components/layout/NewsHeader.tsx`** — Async server component. Header sticky com duas linhas:
- Linha 1: fundo branco, logo + nome do blog (usando `var(--color-primary)` para a cor do texto) à esquerda, `<SearchBar variant="light" />` à direita
- Linha 2: fundo `var(--color-primary)`, links de navegação "Início" + todas as categorias do banco (busca via Drizzle), texto branco, overflow-x-auto
- Props: `{ blogName: string; logoUrl?: string }`

**2. `components/blog/PostCardNews.tsx`** — Componente puro (sem async, sem hooks). Dois variantes:
- `card` (padrão): Link com imagem 16:9, badge de categoria com `var(--color-secondary)`, título h3, data + tempo de leitura
- `mini`: Link horizontal com número de ranking (círculo `var(--color-primary)`), título h4, data, thumbnail opcional
- Props: `{ post: Post; variant?: 'card' | 'mini'; rank?: number }`
- `Post` interface: `{ id, title, slug, content, excerpt, cover_image: string|null, published_at: string|null, categories: {id,name,slug}[] }`
- Use `estimateReadingTime(post.content)` para calcular o tempo de leitura
- Formate datas em pt-BR: `toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })`

**3. `components/blog/CategorySection.tsx`** — Componente puro. Recebe `{ category: {id,name,slug}; posts: Post[] }`. Renderiza:
- Cabeçalho: barra vertical `var(--color-primary)` + nome da categoria em uppercase + link "Ver mais →" alinhado à direita (href `/categoria/{slug}`, cor `var(--color-primary)`)
- Grid `grid-cols-1 sm:grid-cols-3 gap-4` com `<PostCardNews variant="card" />` para cada post
- Retorna `null` se `posts.length === 0`

**4. `components/blog/NewsSidebar.tsx`** — Async server component. Busca via Drizzle:
- 5 posts publicados mais recentes, com a primeira categoria de cada um
- Até 20 tags
- Renderiza seção "Destaques": barra `var(--color-secondary)` + lista numerada de `<PostCardNews variant="mini" rank={i+1} />`
- Renderiza seção "Tags": barra `var(--color-secondary)` + nuvem de links `/tag/{slug}` com `hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]`
- Converta `published_at: Date | null` para `string | null` via `.toISOString()`

**5. Adicione as cores padrão** em `COLOR_DEFAULTS`:
```ts
news: {
  primary: '#003580',
  secondary: '#E8002D',
  background: '#F2F2F2',
  surface: '#FFFFFF',
}
```

**6. Adapte o layout público** (`app/(public)/layout.tsx` ou equivalente):
- Importe `NewsHeader`
- Adicione branch `template === 'news' ? <NewsHeader ... /> : ...` no switch de headers
- Inclua `news` na condição de `max-w-7xl`

**7. Adicione o branch da página inicial** — Crie uma função `getNewsSections()` que:
- Busca todas as categorias (ordenadas por nome)
- Para cada categoria, busca até 3 posts publicados mais recentes (via innerJoin com post_categories)
- Para cada post, busca suas categorias
- Converte `published_at` para ISO string
- Filtra categorias sem posts
- Retorna `{ category, posts }[]`

O branch de renderização deve mostrar:
```tsx
<div className="flex gap-8">
  <div className="flex-1 min-w-0">
    {sections.map(({ category, posts: sectionPosts }) => (
      <CategorySection key={category.id} category={category} posts={sectionPosts} />
    ))}
  </div>
  <div className="hidden lg:block w-72 shrink-0">
    <div className="sticky top-24">
      <NewsSidebar />
    </div>
  </div>
</div>
```

**8. Atualize o schema Zod** da rota de settings para incluir `'news'` no enum de templates.

**9. Atualize o seletor de templates no admin** — adicione `news` em `TEMPLATE_OPTIONS` (com SVG preview) e em `DEFAULT_COLORS`.

Regras importantes:
- Use CSS variables (`var(--color-primary)`, `var(--color-secondary)`) via inline style para cores dinâmicas — não use classes Tailwind hardcoded
- Todos os server components devem ter try/catch retornando array vazio em caso de erro
- Os componentes de card são client-safe (sem 'use client', sem hooks)
- Ao buscar dados no DB para componentes de card, converta `Date` para `string` com `.toISOString()`
- Não use paginação no template news — os dados são buscados diretamente agrupados por categoria
```
