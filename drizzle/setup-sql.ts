export const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text UNIQUE NOT NULL,
  "password_hash" text NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL DEFAULT 'admin',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "excerpt" text NOT NULL DEFAULT '',
  "cover_image" text,
  "status" text NOT NULL DEFAULT 'draft',
  "published_at" timestamp,
  "newsletter_sent_at" timestamp,
  "author_name" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
-- Migração idempotente: garante coluna em bancos existentes
ALTER TABLE IF EXISTS "posts" ADD COLUMN IF NOT EXISTS "author_name" text;

CREATE INDEX IF NOT EXISTS "posts_status_idx" ON "posts" ("status");
CREATE INDEX IF NOT EXISTS "posts_published_at_idx" ON "posts" ("published_at");

CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text UNIQUE NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "description" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tags" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text UNIQUE NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "post_categories" (
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "category_id" integer NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "category_id")
);

CREATE TABLE IF NOT EXISTS "post_tags" (
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "tag_id" integer NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "site_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "token" text UNIQUE NOT NULL,
  "active" text NOT NULL DEFAULT 'true',
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "article_themes" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "source" text NOT NULL DEFAULT 'manual',
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "article_themes_status_idx" ON "article_themes" ("status");

CREATE TABLE IF NOT EXISTS "page_views" (
  "id" serial PRIMARY KEY NOT NULL,
  "path" text NOT NULL,
  "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
  "post_slug" text,
  "post_title" text,
  "referrer" text,
  "user_agent" text,
  "ip" text,
  "visited_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "page_views_visited_at_idx" ON "page_views" ("visited_at");
CREATE INDEX IF NOT EXISTS "page_views_post_id_idx" ON "page_views" ("post_id");
CREATE INDEX IF NOT EXISTS "page_views_path_idx" ON "page_views" ("path");

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text UNIQUE NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "subscribed_at" timestamp NOT NULL DEFAULT now(),
  "unsubscribed_at" timestamp,
  "unsubscribe_token" text UNIQUE,
  "consent_at" timestamp,
  "consent_text_version" text
);
-- Migração idempotente: garante colunas em bancos existentes
ALTER TABLE IF EXISTS "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "consent_at" timestamp;
ALTER TABLE IF EXISTS "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "consent_text_version" text;

CREATE INDEX IF NOT EXISTS "newsletter_email_idx" ON "newsletter_subscribers" ("email");
CREATE INDEX IF NOT EXISTS "newsletter_status_idx" ON "newsletter_subscribers" ("status");

CREATE TABLE IF NOT EXISTS "automation_config" (
  "id" serial PRIMARY KEY NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "interval_hours" real NOT NULL DEFAULT 24,
  "theme_ids" text NOT NULL DEFAULT '[]',
  "custom_prompt" text,
  "last_run_at" timestamp,
  "next_run_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "agent_configs" (
  "id" text PRIMARY KEY NOT NULL,
  "prompt" text NOT NULL DEFAULT '',
  "model" text NOT NULL DEFAULT 'openai/gpt-4o-mini',
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "automation_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "triggered_by" text NOT NULL DEFAULT 'schedule',
  "status" text NOT NULL DEFAULT 'running',
  "message" text,
  "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
  "error" text,
  "duration_ms" integer,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "finished_at" timestamp
);

CREATE INDEX IF NOT EXISTS "automation_logs_started_at_idx" ON "automation_logs" ("started_at");
CREATE INDEX IF NOT EXISTS "automation_logs_status_idx" ON "automation_logs" ("status");

CREATE TABLE IF NOT EXISTS "rss_feeds" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "type" text NOT NULL DEFAULT 'blog',
  "enabled" boolean NOT NULL DEFAULT true,
  "publish_status" text NOT NULL DEFAULT 'draft',
  "check_interval_minutes" integer NOT NULL DEFAULT 60,
  "last_checked_at" timestamp,
  "last_error" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "rss_processed_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "feed_id" integer NOT NULL REFERENCES "rss_feeds"("id") ON DELETE CASCADE,
  "item_guid" text NOT NULL,
  "item_url" text,
  "item_title" text,
  "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'queued',
  "error" text,
  "processed_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "rss_processed_items_feed_guid_idx" ON "rss_processed_items" ("feed_id", "item_guid");

CREATE TABLE IF NOT EXISTS "source_crawlers" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'custom',
  "url" text NOT NULL,
  "prompt" text NOT NULL DEFAULT '',
  "interval_hours" real NOT NULL DEFAULT 24,
  "enabled" boolean NOT NULL DEFAULT true,
  "publish_status" text NOT NULL DEFAULT 'published',
  "last_run_at" timestamp,
  "next_run_at" timestamp,
  "last_error" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "source_crawler_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "crawler_id" integer NOT NULL REFERENCES "source_crawlers"("id") ON DELETE CASCADE,
  "item_key" text NOT NULL,
  "item_title" text,
  "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'done',
  "error" text,
  "processed_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "source_crawler_items_crawler_item_uniq" ON "source_crawler_items" ("crawler_id", "item_key");

CREATE TABLE IF NOT EXISTS "ai_request_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "feature" text NOT NULL,
  "model" text NOT NULL,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "total_tokens" integer NOT NULL DEFAULT 0,
  "cost_usd" real NOT NULL DEFAULT 0,
  "cost_brl" real,
  "usd_brl_rate" real,
  "status" text NOT NULL DEFAULT 'success',
  "error" text,
  "duration_ms" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_request_logs_created_at_idx" ON "ai_request_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_request_logs_feature_idx" ON "ai_request_logs" ("feature");
CREATE INDEX IF NOT EXISTS "ai_request_logs_model_idx" ON "ai_request_logs" ("model");
CREATE INDEX IF NOT EXISTS "ai_request_logs_status_idx" ON "ai_request_logs" ("status");

CREATE TABLE IF NOT EXISTS "webhooks" (
  "id" serial PRIMARY KEY NOT NULL,
  "url" text NOT NULL,
  "secret" text,
  "events" text[] NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "webhooks_enabled_idx" ON "webhooks" ("enabled");

CREATE TABLE IF NOT EXISTS "chat_conversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "title" text NOT NULL DEFAULT 'Nova conversa',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "chat_conversations_user_id_idx" ON "chat_conversations" ("user_id");

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversation_id" integer NOT NULL REFERENCES "chat_conversations"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "tool_calls" text,
  "tool_name" text,
  "model" text,
  "tokens_used" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_idx" ON "chat_messages" ("conversation_id");

-- Default agents_extra: Designer uses SVG code generation (gratuito, sem custo externo)
INSERT INTO "site_settings" ("key", "value", "updated_at")
VALUES (
  'agents_extra',
  '{"designer":{"image_source":"code","code_style":"gradient","designer_enabled":true}}',
  now()
)
ON CONFLICT ("key") DO NOTHING;

-- Bucket de Storage para uploads de imagens (tolerante a falha)
DO $$
BEGIN
  -- Cria ou atualiza o bucket público de uploads
  EXECUTE $sql$
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'uploads',
      'uploads',
      true,
      10485760,
      ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types
  $sql$;

  -- Remove policies antigas (idempotência) e recria apenas a de SELECT público
  EXECUTE $sql$ DROP POLICY IF EXISTS "Service role upload" ON storage.objects $sql$;
  EXECUTE $sql$ DROP POLICY IF EXISTS "Public read uploads" ON storage.objects $sql$;
  EXECUTE $sql$
    CREATE POLICY "Public read uploads"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'uploads')
  $sql$;

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'storage: privilégio insuficiente — bucket/policies não criados (non-fatal)';
  WHEN others THEN
    RAISE NOTICE 'storage: erro ao provisionar bucket (non-fatal): %', SQLERRM;
END $$;
`
