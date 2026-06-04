// GERADO AUTOMATICAMENTE — não edite manualmente
// Conteúdo das migrations embutido como strings para funcionar no bundle do Vercel
// Quando adicionar nova migration: copie o conteúdo do .sql para cá

export const EMBEDDED_MIGRATIONS: Record<string, string> = {
  '0000_abandoned_frank_castle': `CREATE TABLE "agent_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"model" text DEFAULT 'openai/gpt-4o-mini' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"active" text DEFAULT 'true' NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "article_themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"interval_hours" real DEFAULT 24 NOT NULL,
	"theme_ids" text DEFAULT '[]' NOT NULL,
	"custom_prompt" text,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"triggered_by" text DEFAULT 'schedule' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"message" text,
	"post_id" integer,
	"error" text,
	"duration_ms" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"post_id" integer,
	"post_slug" text,
	"post_title" text,
	"referrer" text,
	"user_agent" text,
	"ip" text,
	"visited_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
	"post_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "post_categories_post_id_category_id_pk" PRIMARY KEY("post_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"cover_image" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rss_feeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text DEFAULT 'blog' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"publish_status" text DEFAULT 'draft' NOT NULL,
	"check_interval_minutes" integer DEFAULT 60 NOT NULL,
	"last_checked_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rss_processed_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"feed_id" integer NOT NULL,
	"item_guid" text NOT NULL,
	"item_url" text,
	"item_title" text,
	"post_id" integer,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_crawler_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"crawler_id" integer NOT NULL,
	"item_key" text NOT NULL,
	"item_title" text,
	"post_id" integer,
	"status" text DEFAULT 'done' NOT NULL,
	"error" text,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_crawlers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"url" text NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"interval_hours" real DEFAULT 24 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"publish_status" text DEFAULT 'published' NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rss_processed_items" ADD CONSTRAINT "rss_processed_items_feed_id_rss_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."rss_feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rss_processed_items" ADD CONSTRAINT "rss_processed_items_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_crawler_items" ADD CONSTRAINT "source_crawler_items_crawler_id_source_crawlers_id_fk" FOREIGN KEY ("crawler_id") REFERENCES "public"."source_crawlers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_crawler_items" ADD CONSTRAINT "source_crawler_items_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_themes_status_idx" ON "article_themes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "automation_logs_started_at_idx" ON "automation_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "automation_logs_status_idx" ON "automation_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "newsletter_email_idx" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_status_idx" ON "newsletter_subscribers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "page_views_visited_at_idx" ON "page_views" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "page_views_post_id_idx" ON "page_views" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "page_views_path_idx" ON "page_views" USING btree ("path");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "rss_processed_items_feed_guid_idx" ON "rss_processed_items" USING btree ("feed_id","item_guid");--> statement-breakpoint
CREATE UNIQUE INDEX "source_crawler_items_crawler_item_uniq" ON "source_crawler_items" USING btree ("crawler_id","item_key");`,

  '0001_rapid_zzzax': `CREATE TABLE IF NOT EXISTS "ai_request_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"error" text,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_request_logs_created_at_idx" ON "ai_request_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_request_logs_feature_idx" ON "ai_request_logs" USING btree ("feature");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_request_logs_model_idx" ON "ai_request_logs" USING btree ("model");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_request_logs_status_idx" ON "ai_request_logs" USING btree ("status");--> statement-breakpoint
ALTER TABLE "ai_request_logs" ADD COLUMN IF NOT EXISTS "cost_brl" real;--> statement-breakpoint
ALTER TABLE "ai_request_logs" ADD COLUMN IF NOT EXISTS "usd_brl_rate" real;`,

  '0002_messy_omega_red': `CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "webhooks_enabled_idx" ON "webhooks" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "posts_published_slug_idx" ON "posts" USING btree ("slug") WHERE "posts"."status" = 'published';--> statement-breakpoint
CREATE INDEX "posts_published_published_at_idx" ON "posts" USING btree ("published_at" DESC) WHERE "posts"."status" = 'published';`,

  '0003_careless_fixer': `ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "unsubscribe_token" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "newsletter_sent_at" timestamp;--> statement-breakpoint
UPDATE "newsletter_subscribers" SET "unsubscribe_token" = gen_random_uuid()::text WHERE "unsubscribe_token" IS NULL;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_unsubscribe_token_unique" UNIQUE("unsubscribe_token");`,

  '0004_magenta_william_stryker': `ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "consent_text_version" text;`,

  '0005_stormy_silver_centurion': `CREATE TABLE IF NOT EXISTS "chat_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text DEFAULT 'Nova conversa' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"tool_calls" text,
	"tool_name" text,
	"model" text,
	"tokens_used" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chat_messages_conversation_id_chat_conversations_id_fk'
  ) THEN
    ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversations_user_id_idx" ON "chat_conversations" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_idx" ON "chat_messages" USING btree ("conversation_id");`,

  '0006_provision_storage_bucket': `DO $$
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
END $$;`,

  '0007_chemical_blue_marvel': `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "author_name" text;`,
}

// Ordem de aplicação (mesma do _journal.json)
export const MIGRATION_ORDER = [
  '0000_abandoned_frank_castle',
  '0001_rapid_zzzax',
  '0002_messy_omega_red',
  '0003_careless_fixer',
  '0004_magenta_william_stryker',
  '0005_stormy_silver_centurion',
  '0006_provision_storage_bucket',
  '0007_chemical_blue_marvel',
]
