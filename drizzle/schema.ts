import {
  pgTable,
  text,
  serial,
  integer,
  real,
  timestamp,
  boolean,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('admin'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
})

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').unique().notNull(),
    content: text('content').notNull().default(''),
    excerpt: text('excerpt').notNull().default(''),
    cover_image: text('cover_image'),
    status: text('status', { enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    published_at: timestamp('published_at'),
    created_at: timestamp('created_at').notNull().default(sql`now()`),
    updated_at: timestamp('updated_at').notNull().default(sql`now()`),
  },
  (t) => ({
    statusIdx: index('posts_status_idx').on(t.status),
    publishedAtIdx: index('posts_published_at_idx').on(t.published_at),
    // Índice parcial para as duas queries mais quentes do blog público:
    // post-por-slug e listagem ordenada — ambas filtram status = 'published'.
    // Cobre slug (lookup) e published_at desc (ordenação) sem indexar drafts.
    publishedSlugIdx: index('posts_published_slug_idx')
      .on(t.slug)
      .where(sql`${t.status} = 'published'`),
    publishedPublishedAtIdx: index('posts_published_published_at_idx')
      .on(sql`${t.published_at} DESC`)
      .where(sql`${t.status} = 'published'`),
  })
)

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
})

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
})

export const postCategories = pgTable(
  'post_categories',
  {
    post_id: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    category_id: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.post_id, t.category_id] }) })
)

export const postTags = pgTable(
  'post_tags',
  {
    post_id: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tag_id: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.post_id, t.tag_id] }) })
)

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
})

export const apiTokens = pgTable('api_tokens', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  token: text('token').unique().notNull(),
  active: text('active').notNull().default('true'),
  last_used_at: timestamp('last_used_at'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
})

export const articleThemes = pgTable(
  'article_themes',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    source: text('source').notNull().default('manual'),
    status: text('status').notNull().default('pending'),
    created_at: timestamp('created_at').notNull().default(sql`now()`),
  },
  (t) => ({
    statusIdx: index('article_themes_status_idx').on(t.status),
  })
)

export const pageViews = pgTable(
  'page_views',
  {
    id: serial('id').primaryKey(),
    path: text('path').notNull(),
    post_id: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
    post_slug: text('post_slug'),
    post_title: text('post_title'),
    referrer: text('referrer'),
    user_agent: text('user_agent'),
    ip: text('ip'),
    visited_at: timestamp('visited_at').notNull().default(sql`now()`),
  },
  (t) => ({
    visitedAtIdx: index('page_views_visited_at_idx').on(t.visited_at),
    postIdx: index('page_views_post_id_idx').on(t.post_id),
    pathIdx: index('page_views_path_idx').on(t.path),
  })
)

export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: serial('id').primaryKey(),
    email: text('email').unique().notNull(),
    status: text('status', { enum: ['active', 'unsubscribed'] })
      .notNull()
      .default('active'),
    subscribed_at: timestamp('subscribed_at').notNull().default(sql`now()`),
    unsubscribed_at: timestamp('unsubscribed_at'),
  },
  (t) => ({
    emailIdx: index('newsletter_email_idx').on(t.email),
    statusIdx: index('newsletter_status_idx').on(t.status),
  })
)

export const automationConfig = pgTable('automation_config', {
  id: serial('id').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  interval_hours: real('interval_hours').notNull().default(24),
  theme_ids: text('theme_ids').notNull().default('[]'),
  custom_prompt: text('custom_prompt'),
  last_run_at: timestamp('last_run_at'),
  next_run_at: timestamp('next_run_at'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
})

export const agentConfigs = pgTable('agent_configs', {
  id: text('id').primaryKey(), // agent slug e.g. 'headline', 'researcher'
  prompt: text('prompt').notNull().default(''),
  model: text('model').notNull().default('openai/gpt-4o-mini'),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
})

export const rssFeeds = pgTable('rss_feeds', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  type: text('type').notNull().default('blog'), // 'blog', 'youtube', 'podcast', 'news'
  enabled: boolean('enabled').notNull().default(true),
  publish_status: text('publish_status').notNull().default('draft'), // 'draft' | 'published'
  check_interval_minutes: integer('check_interval_minutes').notNull().default(60),
  last_checked_at: timestamp('last_checked_at'),
  last_error: text('last_error'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
})

export const rssProcessedItems = pgTable(
  'rss_processed_items',
  {
    id: serial('id').primaryKey(),
    feed_id: integer('feed_id')
      .notNull()
      .references(() => rssFeeds.id, { onDelete: 'cascade' }),
    item_guid: text('item_guid').notNull(),
    item_url: text('item_url'),
    item_title: text('item_title'),
    post_id: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('queued'), // 'queued' | 'processing' | 'done' | 'error'
    error: text('error'),
    processed_at: timestamp('processed_at').notNull().default(sql`now()`),
  },
  (t) => ({
    feedGuidIdx: index('rss_processed_items_feed_guid_idx').on(t.feed_id, t.item_guid),
  })
)

export const automationLogs = pgTable(
  'automation_logs',
  {
    id: serial('id').primaryKey(),
    triggered_by: text('triggered_by').notNull().default('schedule'), // 'schedule' | 'manual'
    status: text('status').notNull().default('running'), // 'running' | 'success' | 'skipped' | 'error'
    message: text('message'),
    post_id: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
    error: text('error'),
    duration_ms: integer('duration_ms'),
    started_at: timestamp('started_at').notNull().default(sql`now()`),
    finished_at: timestamp('finished_at'),
  },
  (t) => ({
    startedAtIdx: index('automation_logs_started_at_idx').on(t.started_at),
    statusIdx: index('automation_logs_status_idx').on(t.status),
  })
)

export type AgentConfig = typeof agentConfigs.$inferSelect
export type NewAgentConfig = typeof agentConfigs.$inferInsert

export const postsRelations = relations(posts, ({ many }) => ({
  postCategories: many(postCategories),
  postTags: many(postTags),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  postCategories: many(postCategories),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}))

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, { fields: [postCategories.post_id], references: [posts.id] }),
  category: one(categories, {
    fields: [postCategories.category_id],
    references: [categories.id],
  }),
}))

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.post_id], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tag_id], references: [tags.id] }),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
export type ArticleTheme = typeof articleThemes.$inferSelect
export type NewArticleTheme = typeof articleThemes.$inferInsert
export type SiteSetting = typeof siteSettings.$inferSelect
export type PageView = typeof pageViews.$inferSelect
export type NewPageView = typeof pageViews.$inferInsert
export type AutomationConfig = typeof automationConfig.$inferSelect
export type NewAutomationConfig = typeof automationConfig.$inferInsert
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect
export type NewNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert
export type RssFeed = typeof rssFeeds.$inferSelect
export type NewRssFeed = typeof rssFeeds.$inferInsert
export type RssProcessedItem = typeof rssProcessedItems.$inferSelect
export type NewRssProcessedItem = typeof rssProcessedItems.$inferInsert
export type AutomationLog = typeof automationLogs.$inferSelect
export type NewAutomationLog = typeof automationLogs.$inferInsert

export const sourceCrawlers = pgTable('source_crawlers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('custom'), // 'github' | 'docs' | 'custom'
  url: text('url').notNull(),
  prompt: text('prompt').notNull().default(''),
  interval_hours: real('interval_hours').notNull().default(24),
  enabled: boolean('enabled').notNull().default(true),
  publish_status: text('publish_status').notNull().default('published'), // 'draft' | 'published'
  last_run_at: timestamp('last_run_at'),
  next_run_at: timestamp('next_run_at'),
  last_error: text('last_error'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
  updated_at: timestamp('updated_at').notNull().default(sql`now()`),
})

export const sourceCrawlerItems = pgTable(
  'source_crawler_items',
  {
    id: serial('id').primaryKey(),
    crawler_id: integer('crawler_id')
      .notNull()
      .references(() => sourceCrawlers.id, { onDelete: 'cascade' }),
    item_key: text('item_key').notNull(),
    item_title: text('item_title'),
    post_id: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('done'), // 'done' | 'error'
    error: text('error'),
    processed_at: timestamp('processed_at').notNull().default(sql`now()`),
  },
  (t) => ({ uniq: uniqueIndex('source_crawler_items_crawler_item_uniq').on(t.crawler_id, t.item_key) })
)

export const aiRequestLogs = pgTable(
  'ai_request_logs',
  {
    id: serial('id').primaryKey(),
    feature: text('feature').notNull(),
    model: text('model').notNull(),
    prompt_tokens: integer('prompt_tokens').notNull().default(0),
    completion_tokens: integer('completion_tokens').notNull().default(0),
    total_tokens: integer('total_tokens').notNull().default(0),
    cost_usd: real('cost_usd').notNull().default(0),
    cost_brl: real('cost_brl'),
    usd_brl_rate: real('usd_brl_rate'),
    status: text('status').notNull().default('success'), // 'success' | 'error'
    error: text('error'),
    duration_ms: integer('duration_ms'),
    created_at: timestamp('created_at').notNull().default(sql`now()`),
  },
  (t) => ({
    createdAtIdx: index('ai_request_logs_created_at_idx').on(t.created_at),
    featureIdx: index('ai_request_logs_feature_idx').on(t.feature),
    modelIdx: index('ai_request_logs_model_idx').on(t.model),
    statusIdx: index('ai_request_logs_status_idx').on(t.status),
  })
)

export type SourceCrawler = typeof sourceCrawlers.$inferSelect
export type NewSourceCrawler = typeof sourceCrawlers.$inferInsert
export type SourceCrawlerItem = typeof sourceCrawlerItems.$inferSelect
export type AiRequestLog = typeof aiRequestLogs.$inferSelect
export type NewAiRequestLog = typeof aiRequestLogs.$inferInsert
