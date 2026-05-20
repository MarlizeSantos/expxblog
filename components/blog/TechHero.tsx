import { PostCardTech } from '@/components/blog/PostCardTech'

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

interface Props {
  posts: Post[]
}

export function TechHero({ posts }: Props) {
  if (posts.length === 0) return null

  const [featured, ...rest] = posts
  const secondaries = rest.slice(0, 2)

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
        <div className="lg:col-span-2">
          <PostCardTech post={featured} variant="featured" />
        </div>
        {secondaries.length > 0 && (
          <div className="flex flex-col gap-4">
            {secondaries.map((post) => (
              <PostCardTech key={post.id} post={post} variant="secondary" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
