-- Supabase pg_cron setup para chamadas HTTP aos endpoints /api/cron/*
--
-- Pré-requisitos (executar uma vez, se ainda não habilitados):
--   Supabase Dashboard → Database → Extensions → habilitar pg_cron e pg_net
--
-- Executar no Supabase SQL Editor (Dashboard → SQL Editor)

-- ─── 1. Guardar credenciais no Vault (executar uma vez) ───────────────────────
-- Substitua os valores antes de executar.

select vault.create_secret(
  'https://seu-projeto.vercel.app',  -- URL de produção do blog (sem barra final)
  'app_url'
);

select vault.create_secret(
  'eyJhbGc...',  -- SUPABASE_SERVICE_ROLE_KEY (Supabase Dashboard → Project Settings → API)
  'service_role_key'
);

-- ─── 2. Cron: verificação de feeds RSS a cada 30 minutos ──────────────────────

select cron.schedule(
  'rss-check-every-30min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || '/api/cron/rss',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- ─── 3. Cron: automação de geração de artigos a cada 15 minutos ──────────────
-- O endpoint verifica internamente se já é hora de executar conforme
-- o intervalo configurado no admin. O intervalo mínimo permitido no admin é
-- 15 minutos, então rodar a cada 15 minutos cobre todos os intervalos.

select cron.schedule(
  'automation-check-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || '/api/cron/automation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 600000
  ) as request_id;
  $$
);

-- ─── 4. Cron: source crawlers a cada 15 minutos ──────────────────────────────
-- O endpoint verifica internamente quais crawlers estão com next_run_at vencido.
-- Rodar a cada 15 minutos garante granularidade adequada.

select cron.schedule(
  'source-crawlers-check-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || '/api/cron/source-crawlers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 600000
  ) as request_id;
  $$
);

-- ─── 5. Cron: retenção de dados LGPD (diário, 03:00 UTC) ────────────────────
-- Art. 15/16 LGPD — elimina dados após prazo de retenção:
-- page_views > 12 meses | automation_logs/ai_request_logs > 6 meses | unsubscribed > 30 dias

select cron.schedule(
  'lgpd-data-retention',
  '0 3 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || '/api/cron/data-retention',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- ─── Verificar jobs agendados ─────────────────────────────────────────────────

select jobid, jobname, schedule, command, active
from cron.job
order by jobid;

-- ─── Remover jobs (se necessário) ────────────────────────────────────────────

-- select cron.unschedule('rss-check-every-30min');
-- select cron.unschedule('automation-check-every-15min');
-- select cron.unschedule('source-crawlers-check-every-15min');
-- select cron.unschedule('lgpd-data-retention');
