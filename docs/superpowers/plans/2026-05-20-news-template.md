# News Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "News" template inspired by TechTudo.com.br with a two-row sticky header, a home page grouped by category + right sidebar (Destaques + tag cloud), and news-style post cards using CSS custom properties for dynamic theming.

**Architecture:** The `news` template follows the same pattern as `portal` and `business`: a dedicated header component, dedicated card/section components, and a branch in `app/(public)/page.tsx`. The home page fetches posts grouped by category via direct Drizzle queries (no API round-trip), renders a `CategorySection` per category alongside a sticky `NewsSidebar`. All color references use `var(--color-primary)` / `var(--color-secondary)` CSS custom properties.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Drizzle ORM (`drizzle-orm/pg-core`), CSS custom properties

---

## File Map

**Create:**
- `components/layout/NewsHeader.tsx` — Async server component. Row 1: white bg, logo left + search right. Row 2: `var(--color-primary)` bg, horizontal category nav links.
- `components/blog/PostCardNews.tsx` — Two variants: `card` (vertical image+badge+title+meta) and `mini` (horizontal number+image+title for sidebar).
- `components/blog/CategorySection.tsx` — Section heading with colored left border accent + 3-column card grid + "Ver mais →" link.
- `components/blog/NewsSidebar.tsx` — Async server component. "Destaques" numbered list (5 most recent posts) + "Tags" cloud.

**Modify:**
- `lib/settings.ts` — Add `news` entry to `COLOR_DEFAULTS`.
- `app/(public)/layout.tsx` — Import `NewsHeader`, add it to the template header switch, include `news` in the `max-w-7xl` branch.
- `app/(public)/page.tsx` — Add `getNewsSections()` function + `news` template branch.
- `app/api/admin/settings/route.ts` — Add `'news'` to `z.enum([...])`.
- `app/admin/aparencia/ApparenceClient.tsx` — Add `news` entry to `TEMPLATE_OPTIONS` and `DEFAULT_COLORS`.

---

## Task 1: Add `news` color defaults to `lib/settings.ts`

**Files:**
- Modify: `lib/settings.ts`

- [ ] **Step 1: Add the `news` entry to `COLOR_DEFAULTS`**

In `lib/settings.ts`, find `COLOR_DEFAULTS` (around line 33). Add the `news` entry after `business`:

```ts
const COLOR_DEFAULTS: Record<string, ThemeColors> = {
  default: {
    primary: '#1A4FA0',
    secondary: '#F58A2D',
    background: '#F9FAFB',
    surface: '#FFFFFF',
  },
  portal: {
    primary: '#CC0000',
    secondary: '#FF6600',
    background: '#F5F5F5',
    surface: '#FFFFFF',
  },
  business: {
    primary: '#0D1B4B',
    secondary: '#FF6B35',
    background: '#F7F8FA',
    surface: '#FFFFFF',
  },
  news: {
    primary: '#003580',
    secondary: '#E8002D',
    background: '#F2F2F2',
    surface: '#FFFFFF',
  },
}
```

- [ ] **Step 2: Verify build passes**

```powershell
npm run build
```

Expected: build succeeds (no TypeScript errors).

- [ ] **Step 3: Commit**

```powershell
git add lib/settings.ts
git commit -m "feat: add news template color defaults"
```

---

## Task 2: Create `components/layout/NewsHeader.tsx`

**Files:**
- Create: `components/layout/NewsHeader.tsx`

- [ ] **Step 1: Create the file with this exact content**

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

- [ ] **Step 2: Verify build passes**

```powershell
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```powershell
git add components/layout/NewsHeader.tsx
git commit -m "feat: add NewsHeader two-row sticky header for news template"
```

---

## Task 3: Create `components/blog/PostCardNews.tsx`

**Files:**
- Create: `components/blog/PostCardNews.tsx`

- [ ] **Step 1: Create the file with this exact content**

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
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
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
          {formatDate(post.published_at)} · {readTime} min
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify build passes**

```powershell
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```powershell
git add components/blog/PostCardNews.tsx
git commit -m "feat: add PostCardNews card and mini variants"
```

---

## Task 4: Create `components/blog/CategorySection.tsx`

**Files:**
- Create: `components/blog/CategorySection.tsx`

- [ ] **Step 1: Create the file with this exact content**

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

- [ ] **Step 2: Verify build passes**

```powershell
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```powershell
git add components/blog/CategorySection.tsx
git commit -m "feat: add CategorySection component for news template"
```

---

## Task 5: Create `components/blog/NewsSidebar.tsx`

**Files:**
- Create: `components/blog/NewsSidebar.tsx`

- [ ] **Step 1: Create the file with this exact content**

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

- [ ] **Step 2: Verify build passes**

```powershell
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```powershell
git add components/blog/NewsSidebar.tsx
git commit -m "feat: add NewsSidebar with Destaques list and tag cloud"
```

---

## Task 6: Wire up layout and settings API

**Files:**
- Modify: `app/(public)/layout.tsx`
- Modify: `app/api/admin/settings/route.ts`

- [ ] **Step 1: Update `app/(public)/layout.tsx`**

Add `NewsHeader` import at the top alongside the other header imports:

```tsx
import { Header } from '@/components/layout/Header'
import { PortalHeader } from '@/components/layout/PortalHeader'
import { BusinessHeader } from '@/components/layout/BusinessHeader'
import { NewsHeader } from '@/components/layout/NewsHeader'
import { Footer } from '@/components/layout/Footer'
import { getSettings } from '@/lib/settings'
import type { Metadata } from 'next'
```

Replace the header ternary (currently ending with `: <Header .../>`) with the 4-way version:

```tsx
{template === 'portal'
  ? <PortalHeader blogName={blogName} logoUrl={logoUrl} />
  : template === 'business'
    ? <BusinessHeader blogName={blogName} logoUrl={logoUrl} />
    : template === 'news'
      ? <NewsHeader blogName={blogName} logoUrl={logoUrl} />
      : <Header blogName={blogName} logoUrl={logoUrl} />
}
```

Replace the `main` className ternary to include `news` in the wide (`max-w-7xl`) branch:

```tsx
<main
  className={`flex-1 w-full mx-auto px-4 py-8 ${
    template === 'portal' || template === 'business' || template === 'news'
      ? 'max-w-7xl'
      : 'max-w-6xl'
  }`}
>
```

- [ ] **Step 2: Update `app/api/admin/settings/route.ts`**

Find the template enum (line ~14) and add `'news'`:

```ts
template: z.enum(['default', 'portal', 'business', 'news']).optional(),
```

- [ ] **Step 3: Verify build passes**

```powershell
npm run build
```

Expected: no TypeScript errors, 40+ routes compiled.

- [ ] **Step 4: Commit**

```powershell
git add "app/(public)/layout.tsx" app/api/admin/settings/route.ts
git commit -m "feat: wire NewsHeader into public layout and extend settings API enum"
```

---

## Task 7: Add news home page branch in `app/(public)/page.tsx`

**Files:**
- Modify: `app/(public)/page.tsx`

- [ ] **Step 1: Add new imports at the top of the file**

Add these imports alongside the existing ones:

```tsx
import { CategorySection } from '@/components/blog/CategorySection'
import { NewsSidebar } from '@/components/blog/NewsSidebar'
import { db } from '@/drizzle/db'
import { posts, postCategories, categories } from '@/drizzle/schema'
import { eq, desc, and, asc } from 'drizzle-orm'
```

- [ ] **Step 2: Add `getNewsSections()` function after the existing `getCategories()` function**

```ts
type NewsPost = {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  published_at: string | null
  categories: { id: number; name: string; slug: string }[]
}

async function getNewsSections(): Promise<
  { category: { id: number; name: string; slug: string }; posts: NewsPost[] }[]
> {
  try {
    const cats = await db.select().from(categories).orderBy(asc(categories.name))
    const sections = await Promise.all(
      cats.map(async (cat) => {
        const rows = await db
          .select({ post: posts })
          .from(posts)
          .innerJoin(postCategories, eq(postCategories.post_id, posts.id))
          .where(
            and(
              eq(posts.status, 'published'),
              eq(postCategories.category_id, cat.id)
            )
          )
          .orderBy(desc(posts.published_at))
          .limit(3)

        const postsWithCats = await Promise.all(
          rows.map(async ({ post: p }) => {
            const catRows = await db
              .select({ category: categories })
              .from(postCategories)
              .innerJoin(categories, eq(categories.id, postCategories.category_id))
              .where(eq(postCategories.post_id, p.id))
              .limit(3)
            return {
              ...p,
              published_at: p.published_at?.toISOString() ?? null,
              categories: catRows.map((r) => r.category),
            }
          })
        )
        return { category: cat, posts: postsWithCats }
      })
    )
    return sections.filter((s) => s.posts.length > 0)
  } catch {
    return []
  }
}
```

- [ ] **Step 3: Add the `news` branch in `HomePage`**

In the `HomePage` function, update the `pageLimit` line and add the `news` branch before the existing `return` for the default template. The updated `pageLimit`:

```ts
const pageLimit =
  template === 'portal' ? '10' :
  template === 'business' ? '12' :
  template === 'news' ? '0' :
  '9'
```

Add this block after the `if (template === 'business') { ... }` block:

```tsx
if (template === 'news') {
  const sections = await getNewsSections()
  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        {sections.length === 0 && (
          <p className="text-gray-500">Nenhum post publicado ainda.</p>
        )}
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
  )
}
```

Note: `pageLimit = '0'` for `news` because the news template uses `getNewsSections()` directly instead of paginated API calls, so `getPosts` / `getCategories` results are unused for `news`. The existing `Promise.all([getPosts(...), getCategories()])` still runs for all templates — this is fine since its cost is negligible (results are unused). If performance becomes a concern, the `getPosts` call can be skipped when `template === 'news'` in a future refactor.

- [ ] **Step 4: Verify build passes**

```powershell
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```powershell
git add "app/(public)/page.tsx"
git commit -m "feat: add news template home page with per-category sections and sidebar"
```

---

## Task 8: Add news template option to admin Aparência

**Files:**
- Modify: `app/admin/aparencia/ApparenceClient.tsx`

- [ ] **Step 1: Add `news` entry to `TEMPLATE_OPTIONS` array**

In `ApparenceClient.tsx`, find `TEMPLATE_OPTIONS` (starts around line 11). Append this entry after the `business` entry (before the closing `]`):

```tsx
{
  id: 'news',
  name: 'News',
  description: 'Estilo portal de notícias com seções por categoria e sidebar de destaques',
  preview: (
    <svg viewBox="0 0 240 160" className="w-full" xmlns="http://www.w3.org/2000/svg">
      {/* Header row 1: white */}
      <rect x="0" y="0" width="240" height="16" fill="white" rx="3" />
      <rect x="0" y="15" width="240" height="1" fill="#e5e7eb" />
      <rect x="8" y="4" width="44" height="7" fill="#003580" rx="2" />
      <rect x="180" y="3" width="52" height="9" fill="#f3f4f6" rx="3" />
      {/* Header row 2: primary blue */}
      <rect x="0" y="16" width="240" height="13" fill="#003580" />
      <rect x="8" y="20" width="18" height="5" fill="white" opacity="0.9" rx="1" />
      <rect x="32" y="20" width="24" height="5" fill="white" opacity="0.55" rx="1" />
      <rect x="62" y="20" width="20" height="5" fill="white" opacity="0.55" rx="1" />
      <rect x="88" y="20" width="28" height="5" fill="white" opacity="0.55" rx="1" />
      {/* Section 1 heading */}
      <rect x="0" y="34" width="3" height="8" fill="#003580" rx="1" />
      <rect x="7" y="36" width="44" height="4" fill="#1a1a2e" rx="1" />
      <rect x="138" y="35" width="22" height="5" fill="#003580" opacity="0.4" rx="1" />
      {/* Section 1 cards row */}
      <rect x="0" y="45" width="52" height="38" fill="white" rx="2" />
      <rect x="0" y="45" width="52" height="22" fill="#e5e7eb" rx="2" />
      <rect x="2" y="70" width="44" height="4" fill="#d1d5db" rx="1" />
      <rect x="55" y="45" width="52" height="38" fill="white" rx="2" />
      <rect x="55" y="45" width="52" height="22" fill="#e5e7eb" rx="2" />
      <rect x="57" y="70" width="44" height="4" fill="#d1d5db" rx="1" />
      <rect x="110" y="45" width="52" height="38" fill="white" rx="2" />
      <rect x="110" y="45" width="52" height="22" fill="#e5e7eb" rx="2" />
      <rect x="112" y="70" width="44" height="4" fill="#d1d5db" rx="1" />
      {/* Section 2 heading */}
      <rect x="0" y="88" width="3" height="8" fill="#003580" rx="1" />
      <rect x="7" y="90" width="38" height="4" fill="#1a1a2e" rx="1" />
      {/* Section 2 cards row */}
      <rect x="0" y="98" width="52" height="34" fill="white" rx="2" />
      <rect x="0" y="98" width="52" height="18" fill="#e5e7eb" rx="2" />
      <rect x="2" y="120" width="44" height="4" fill="#d1d5db" rx="1" />
      <rect x="55" y="98" width="52" height="34" fill="white" rx="2" />
      <rect x="55" y="98" width="52" height="18" fill="#e5e7eb" rx="2" />
      <rect x="57" y="120" width="44" height="4" fill="#d1d5db" rx="1" />
      <rect x="110" y="98" width="52" height="34" fill="white" rx="2" />
      <rect x="110" y="98" width="52" height="18" fill="#e5e7eb" rx="2" />
      <rect x="112" y="120" width="44" height="4" fill="#d1d5db" rx="1" />
      {/* Right sidebar */}
      <rect x="167" y="30" width="73" height="104" fill="white" rx="3" />
      <rect x="169" y="33" width="3" height="7" fill="#E8002D" rx="1" />
      <rect x="176" y="35" width="36" height="4" fill="#1a1a2e" rx="1" />
      <rect x="169" y="45" width="16" height="11" fill="#e5e7eb" rx="1" />
      <rect x="169" y="45" width="7" height="7" fill="#003580" rx="3" />
      <rect x="189" y="46" width="46" height="3" fill="#d1d5db" rx="1" />
      <rect x="189" y="52" width="32" height="3" fill="#e5e7eb" rx="1" />
      <rect x="169" y="61" width="16" height="11" fill="#e5e7eb" rx="1" />
      <rect x="169" y="61" width="7" height="7" fill="#003580" rx="3" />
      <rect x="189" y="62" width="46" height="3" fill="#d1d5db" rx="1" />
      <rect x="189" y="68" width="32" height="3" fill="#e5e7eb" rx="1" />
      <rect x="169" y="77" width="16" height="11" fill="#e5e7eb" rx="1" />
      <rect x="169" y="77" width="7" height="7" fill="#003580" rx="3" />
      <rect x="189" y="78" width="46" height="3" fill="#d1d5db" rx="1" />
      <rect x="189" y="84" width="32" height="3" fill="#e5e7eb" rx="1" />
      <rect x="169" y="96" width="3" height="7" fill="#E8002D" rx="1" />
      <rect x="176" y="98" width="24" height="4" fill="#1a1a2e" rx="1" />
      <rect x="169" y="107" width="28" height="8" fill="#f3f4f6" rx="4" />
      <rect x="200" y="107" width="22" height="8" fill="#f3f4f6" rx="4" />
      <rect x="169" y="119" width="32" height="8" fill="#f3f4f6" rx="4" />
      <rect x="204" y="119" width="28" height="8" fill="#f3f4f6" rx="4" />
      {/* Footer */}
      <rect x="0" y="150" width="240" height="10" fill="#003580" rx="2" />
    </svg>
  ),
},
```

- [ ] **Step 2: Add `news` entry to `DEFAULT_COLORS`**

Find `DEFAULT_COLORS` (around line 140). Add `news`:

```ts
const DEFAULT_COLORS: Record<string, ThemeColors> = {
  default: { primary: '#1A4FA0', secondary: '#F58A2D', background: '#F9FAFB', surface: '#FFFFFF' },
  portal: { primary: '#CC0000', secondary: '#FF6600', background: '#F5F5F5', surface: '#FFFFFF' },
  business: { primary: '#0D1B4B', secondary: '#FF6B35', background: '#F7F8FA', surface: '#FFFFFF' },
  news: { primary: '#003580', secondary: '#E8002D', background: '#F2F2F2', surface: '#FFFFFF' },
}
```

- [ ] **Step 3: Verify build passes**

```powershell
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit and push**

```powershell
git add app/admin/aparencia/ApparenceClient.tsx
git commit -m "feat: add news template option to admin Aparencia"
git push origin master
```

---

## Self-Review

**Spec coverage check:**
- ✅ Two-row header (white top + colored category strip) → Task 2 `NewsHeader`
- ✅ Home page grouped by category → Task 7 `getNewsSections()` + `CategorySection`
- ✅ Right sidebar (Destaques + tag cloud) → Tasks 5 & 7
- ✅ News-style post cards with CSS variable colors → Task 3 `PostCardNews`
- ✅ Color defaults (`#003580` / `#E8002D`) → Task 1 & 8
- ✅ Layout wiring (layout.tsx header switch + max-w-7xl) → Task 6
- ✅ Settings API enum extended → Task 6
- ✅ Admin template selector → Task 8

**Placeholder scan:** No TBDs, all code is complete.

**Type consistency:**
- `Post` interface in `PostCardNews`, `CategorySection`, `NewsSidebar`, and `getNewsSections` all use `published_at: string | null` (Date serialized to ISO string in data fetchers).
- `categories` field is `{ id: number; name: string; slug: string }[]` everywhere.
- `NewsHeader` props: `{ blogName: string; logoUrl?: string }` — matches the pattern of all other headers.
