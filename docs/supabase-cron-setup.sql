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

-- ─── Verificar jobs agendados ─────────────────────────────────────────────────

select jobid, jobname, schedule, command, active
from cron.job
order by jobid;

-- ─── Remover o job (se necessário) ───────────────────────────────────────────

-- select cron.unschedule('rss-check-every-30min');
