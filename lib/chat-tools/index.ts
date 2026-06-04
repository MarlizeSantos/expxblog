/**
 * lib/chat-tools/index.ts
 * Registry central de tools para o assistente de chat.
 * Cada tool expõe definição OpenAI-style + execute() que chama funções de lib/ diretamente.
 */
import type { ToolDefinition } from '@/lib/ai'

export interface ToolContext {
  userId?: number
}

export interface ChatTool {
  definition: ToolDefinition
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<unknown>
}

// ── Implementations ───────────────────────────────────────────────────────────

import { db } from '@/drizzle/db'
import {
  posts,
  categories,
  tags,
  articleThemes,
  newsletterSubscribers,
  automationConfig,
  automationLogs,
  postCategories,
  postTags,
} from '@/drizzle/schema'
import { eq, desc, count, and, sql } from 'drizzle-orm'
import { generateSlug } from '@/lib/slug'
import sanitizeHtml from 'sanitize-html'

function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
  })
}

// ── suggest_themes ────────────────────────────────────────────────────────────
const suggestThemesTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'suggest_themes',
      description: 'Sugere temas de artigos baseados em tendências ou palavra-chave. Retorna lista de títulos sugeridos.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Área ou palavra-chave para gerar sugestões' },
          count: { type: 'number', description: 'Número de sugestões (padrão: 5, máx: 10)' },
        },
        required: ['topic'],
      },
    },
  },
  async execute(args) {
    const topic = String(args.topic ?? '')
    const count_ = Math.min(10, Number(args.count ?? 5))
    // Retorna os temas já cadastrados relacionados ao tópico
    const existing = await db
      .select({ id: articleThemes.id, title: articleThemes.title, description: articleThemes.description, status: articleThemes.status })
      .from(articleThemes)
      .where(sql`${articleThemes.title} ILIKE ${'%' + topic + '%'}`)
      .orderBy(desc(articleThemes.created_at))
      .limit(count_)
    return { topic, suggestions: existing, note: `${existing.length} tema(s) encontrado(s) relacionados a "${topic}"` }
  },
}

// ── create_theme ──────────────────────────────────────────────────────────────
const createThemeTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'create_theme',
      description: 'Cria um novo tema/pauta de artigo no banco de dados.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título do tema' },
          description: { type: 'string', description: 'Descrição ou contexto do tema (opcional)' },
        },
        required: ['title'],
      },
    },
  },
  async execute(args) {
    const title = String(args.title ?? '').trim()
    if (!title) return { error: 'Título obrigatório' }
    const [theme] = await db
      .insert(articleThemes)
      .values({ title, description: args.description ? String(args.description) : null, source: 'chat', status: 'pending' })
      .returning()
    return { success: true, theme }
  },
}

// ── run_article_pipeline ──────────────────────────────────────────────────────
// Esta tool é especial — o handler de /api/admin/chat/message a intercepta
// antes de chamar execute() e faz stream da pipeline. O execute() aqui é
// um fallback que retorna as informações para o assistente iniciar.
const runArticlePipelineTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'run_article_pipeline',
      description: 'Dispara o pipeline de geração de artigo (Headline → Researcher → Analyst → Copywriter → Reviewer → CTA → Designer → Publisher). Use quando o usuário pedir para criar/gerar um artigo.',
      parameters: {
        type: 'object',
        properties: {
          theme_title: { type: 'string', description: 'Título ou tema do artigo a ser gerado' },
          theme_description: { type: 'string', description: 'Descrição adicional do tema (opcional)' },
          theme_id: { type: 'number', description: 'ID de um tema já cadastrado (opcional, alternativa ao theme_title)' },
          publish_status: { type: 'string', enum: ['draft', 'published'], description: 'Status de publicação (padrão: draft)' },
        },
        required: [],
      },
    },
  },
  async execute(args) {
    // Chamado apenas como fallback — o route handler intercepta antes
    return {
      pipeline_started: true,
      theme_title: args.theme_title ?? 'Tema não especificado',
      note: 'Pipeline de geração de artigo iniciada. Acompanhe o progresso no chat.',
    }
  },
}

// ── list_posts ────────────────────────────────────────────────────────────────
const listPostsTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'list_posts',
      description: 'Lista artigos do blog com opção de filtrar por status, busca ou limite.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['draft', 'published', 'all'], description: 'Filtrar por status (padrão: all)' },
          search: { type: 'string', description: 'Buscar por título (opcional)' },
          limit: { type: 'number', description: 'Máximo de resultados (padrão: 10, máx: 50)' },
        },
      },
    },
  },
  async execute(args) {
    const limit_ = Math.min(50, Number(args.limit ?? 10))
    const statusFilter = String(args.status ?? 'all')
    const search = args.search ? String(args.search) : null

    const conditions = []
    if (statusFilter === 'draft') conditions.push(eq(posts.status, 'draft'))
    if (statusFilter === 'published') conditions.push(eq(posts.status, 'published'))
    if (search) conditions.push(sql`${posts.title} ILIKE ${'%' + search + '%'}`)

    const rows = await db
      .select({ id: posts.id, title: posts.title, slug: posts.slug, status: posts.status, published_at: posts.published_at, created_at: posts.created_at })
      .from(posts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(posts.created_at))
      .limit(limit_)

    return { posts: rows, total: rows.length }
  },
}

// ── get_post ──────────────────────────────────────────────────────────────────
const getPostTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_post',
      description: 'Busca detalhes completos de um artigo pelo ID ou slug.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'ID do artigo' },
          slug: { type: 'string', description: 'Slug do artigo' },
        },
      },
    },
  },
  async execute(args) {
    const id = args.id ? Number(args.id) : null
    const slug = args.slug ? String(args.slug) : null
    if (!id && !slug) return { error: 'Informe id ou slug' }

    const cond = id ? eq(posts.id, id) : eq(posts.slug, slug!)
    const [post] = await db.select().from(posts).where(cond).limit(1)
    if (!post) return { error: 'Artigo não encontrado' }

    const cats = await db
      .select({ name: categories.name, slug: categories.slug })
      .from(postCategories)
      .innerJoin(categories, eq(postCategories.category_id, categories.id))
      .where(eq(postCategories.post_id, post.id))

    const tgs = await db
      .select({ name: tags.name, slug: tags.slug })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tag_id, tags.id))
      .where(eq(postTags.post_id, post.id))

    return { ...post, categories: cats, tags: tgs }
  },
}

// ── update_post ───────────────────────────────────────────────────────────────
const updatePostTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'update_post',
      description: 'Atualiza campos de um artigo existente (título, excerpt, conteúdo).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'ID do artigo' },
          title: { type: 'string', description: 'Novo título (opcional)' },
          excerpt: { type: 'string', description: 'Novo resumo (opcional)' },
          content: { type: 'string', description: 'Novo conteúdo HTML (opcional)' },
        },
        required: ['id'],
      },
    },
  },
  async execute(args) {
    const id = Number(args.id)
    if (!id) return { error: 'ID obrigatório' }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (args.title) updates.title = String(args.title)
    if (args.excerpt) updates.excerpt = String(args.excerpt)
    if (args.content) updates.content = sanitize(String(args.content))

    const [updated] = await db.update(posts).set(updates).where(eq(posts.id, id)).returning()
    if (!updated) return { error: 'Artigo não encontrado' }
    return { success: true, post: { id: updated.id, title: updated.title, status: updated.status } }
  },
}

// ── publish_post ──────────────────────────────────────────────────────────────
const publishPostTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'publish_post',
      description: 'Publica um artigo (muda status para published).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'ID do artigo a publicar' },
        },
        required: ['id'],
      },
    },
  },
  async execute(args) {
    const id = Number(args.id)
    const [updated] = await db.update(posts).set({ status: 'published', published_at: new Date(), updated_at: new Date() }).where(eq(posts.id, id)).returning()
    if (!updated) return { error: 'Artigo não encontrado' }
    return { success: true, post: { id: updated.id, title: updated.title, status: updated.status, published_at: updated.published_at } }
  },
}

// ── unpublish_post ────────────────────────────────────────────────────────────
const unpublishPostTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'unpublish_post',
      description: 'Despublica um artigo (muda status para draft).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'ID do artigo a despublicar' },
        },
        required: ['id'],
      },
    },
  },
  async execute(args) {
    const id = Number(args.id)
    const [updated] = await db.update(posts).set({ status: 'draft', updated_at: new Date() }).where(eq(posts.id, id)).returning()
    if (!updated) return { error: 'Artigo não encontrado' }
    return { success: true, post: { id: updated.id, title: updated.title, status: updated.status } }
  },
}

// ── create_category ───────────────────────────────────────────────────────────
const createCategoryTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'create_category',
      description: 'Cria uma nova categoria no blog.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome da categoria' },
          description: { type: 'string', description: 'Descrição (opcional)' },
        },
        required: ['name'],
      },
    },
  },
  async execute(args) {
    const name = String(args.name ?? '').trim()
    if (!name) return { error: 'Nome obrigatório' }
    const slug = generateSlug(name)
    const [category] = await db
      .insert(categories)
      .values({ name, slug, description: args.description ? String(args.description) : null })
      .returning()
    return { success: true, category }
  },
}

// ── create_tag ────────────────────────────────────────────────────────────────
const createTagTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'create_tag',
      description: 'Cria uma nova tag no blog.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome da tag' },
        },
        required: ['name'],
      },
    },
  },
  async execute(args) {
    const name = String(args.name ?? '').trim()
    if (!name) return { error: 'Nome obrigatório' }
    const slug = generateSlug(name)
    const [tag] = await db.insert(tags).values({ name, slug }).returning()
    return { success: true, tag }
  },
}

// ── get_analytics ─────────────────────────────────────────────────────────────
const getAnalyticsTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_analytics',
      description: 'Retorna dados analíticos do blog: total de pageviews, artigos mais visitados, etc.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Período em dias (padrão: 30)' },
        },
      },
    },
  },
  async execute(args) {
    const days = Math.min(365, Number(args.days ?? 30))
    const { pageViews } = await import('@/drizzle/schema')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [{ total }] = await db
      .select({ total: count() })
      .from(pageViews)
      .where(sql`${pageViews.visited_at} >= ${since}`)

    const topPosts = await db
      .select({ post_title: pageViews.post_title, post_slug: pageViews.post_slug, views: count() })
      .from(pageViews)
      .where(sql`${pageViews.visited_at} >= ${since} AND ${pageViews.post_slug} IS NOT NULL`)
      .groupBy(pageViews.post_title, pageViews.post_slug)
      .orderBy(desc(count()))
      .limit(10)

    return { period_days: days, total_views: total, top_posts: topPosts }
  },
}

// ── get_dashboard_overview ────────────────────────────────────────────────────
const getDashboardOverviewTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_dashboard_overview',
      description: 'Retorna visão geral do blog: contagem de artigos, categorias, tags, assinantes.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  async execute() {
    const [[{ totalPosts }], [{ publishedPosts }], [{ totalCats }], [{ totalTags }], [{ totalSubs }]] =
      await Promise.all([
        db.select({ totalPosts: count() }).from(posts),
        db.select({ publishedPosts: count() }).from(posts).where(eq(posts.status, 'published')),
        db.select({ totalCats: count() }).from(categories),
        db.select({ totalTags: count() }).from(tags),
        db.select({ totalSubs: count() }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, 'active')),
      ])

    return {
      posts: { total: totalPosts, published: publishedPosts, draft: totalPosts - publishedPosts },
      categories: totalCats,
      tags: totalTags,
      newsletter_subscribers: totalSubs,
    }
  },
}

// ── newsletter_count ──────────────────────────────────────────────────────────
const newsletterCountTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'newsletter_count',
      description: 'Retorna a contagem de assinantes ativos da newsletter.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  async execute() {
    const [{ total }] = await db.select({ total: count() }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, 'active'))
    return { active_subscribers: total }
  },
}

// ── get_automation_status ─────────────────────────────────────────────────────
const getAutomationStatusTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_automation_status',
      description: 'Retorna o status da automação de geração de artigos (habilitada, próxima execução, últimos logs).',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  async execute() {
    const [config] = await db.select().from(automationConfig).limit(1)
    const recentLogs = await db
      .select({ id: automationLogs.id, status: automationLogs.status, message: automationLogs.message, started_at: automationLogs.started_at })
      .from(automationLogs)
      .orderBy(desc(automationLogs.started_at))
      .limit(5)

    return { config: config ?? null, recent_logs: recentLogs }
  },
}

// ── Registry ──────────────────────────────────────────────────────────────────

const REGISTRY: Record<string, ChatTool> = {
  suggest_themes: suggestThemesTool,
  create_theme: createThemeTool,
  run_article_pipeline: runArticlePipelineTool,
  list_posts: listPostsTool,
  get_post: getPostTool,
  update_post: updatePostTool,
  publish_post: publishPostTool,
  unpublish_post: unpublishPostTool,
  create_category: createCategoryTool,
  create_tag: createTagTool,
  get_analytics: getAnalyticsTool,
  get_dashboard_overview: getDashboardOverviewTool,
  newsletter_count: newsletterCountTool,
  get_automation_status: getAutomationStatusTool,
}

export function getToolDefinitions(): ToolDefinition[] {
  return Object.values(REGISTRY).map((t) => t.definition)
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  const tool = REGISTRY[name]
  if (!tool) return { error: `Tool desconhecida: ${name}` }
  try {
    return await tool.execute(args, ctx)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao executar tool' }
  }
}
