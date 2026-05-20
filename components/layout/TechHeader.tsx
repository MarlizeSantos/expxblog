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

export async function TechHeader({ blogName, logoUrl }: Props) {
  const cats = await getCategories()

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-[#111111] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-7 w-auto" />
            ) : (
              <span className="text-white text-xl font-black tracking-tight">
                {blogName}
              </span>
            )}
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm font-semibold text-white whitespace-nowrap rounded hover:bg-white/10 transition-colors"
            >
              Início
            </Link>
            {cats.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                className="px-3 py-1.5 text-sm font-medium text-white/70 whitespace-nowrap rounded hover:text-white hover:bg-white/10 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          <div className="shrink-0 w-48">
            <SearchBar variant="dark" />
          </div>
        </div>
      </div>
    </header>
  )
}
