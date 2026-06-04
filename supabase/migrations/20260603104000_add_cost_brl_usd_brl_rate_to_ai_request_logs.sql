ALTER TABLE "ai_request_logs" ADD COLUMN IF NOT EXISTS "cost_brl" real;
ALTER TABLE "ai_request_logs" ADD COLUMN IF NOT EXISTS "usd_brl_rate" real;
