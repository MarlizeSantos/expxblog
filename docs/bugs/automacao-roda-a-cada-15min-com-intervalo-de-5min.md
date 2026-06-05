# Bug: Automação roda só a cada 15 min mesmo com intervalo de 5 min

**Data**: 2026-06-05
**Severidade**: MÉDIO
**Status**: RESOLVIDO

## Descrição do problema
No `/admin/artigos` → automação de postagens, o usuário definia o intervalo de publicação
para "a cada 5 minutos", mas pelo histórico de execução (`automation_logs`) os artigos só
eram gerados a cada 15 minutos. As opções de 5 e 10 minutos eram, na prática, inalcançáveis.

## Causa-raiz
**Arquivo**: `lib/supabase-cron.ts`
**Linha**: 71-76 (`CRON_DEFS.automation`)
**Tipo**: lógica — descompasso de granularidade entre o agendador (pg_cron) e o intervalo configurável

O sistema tem duas camadas de tempo. O **pg_cron** (Supabase) dispara o endpoint
`/api/cron/automation` numa frequência fixa de 15 minutos (`*/15 * * * *`). O checker interno
`runAutomationCycle` (`lib/automation.ts:34`) só avalia `next_run_at` quando é chamado pelo
pg_cron. O `interval_hours` salvo pelo usuário e o cálculo de `next_run_at` estavam corretos,
mas o tick do agendador só "batia na porta" a cada 15 min — então qualquer intervalo menor
colapsava para 15 min.

## Solução aplicada
**Decisão de produto**: o intervalo mínimo de geração de artigos passa a ser **15 minutos**,
e a cron permanece em `*/15 * * * *`. Isso elimina a expectativa quebrada (opções de 5/10 min
que nunca funcionavam) e, crucialmente, **evita ciclos concorrentes**: o pipeline de agentes
de IA pode levar vários minutos, e como `next_run_at` só é gravado ao final do ciclo, um tick
de 5 min poderia iniciar um segundo ciclo concorrente → posts duplicados. Com 15 min há folga
suficiente para o ciclo terminar antes do próximo tick.

**Arquivos modificados**:
- `app/admin/artigos/ArtigosClient.tsx` — removidas as opções "A cada 5 minutos" e
  "A cada 10 minutos" de `INTERVAL_OPTIONS`; o menor passa a ser 15 minutos.
- `app/api/admin/automation/route.ts` — clamp do `interval_hours` ajustado de `Math.max(5/60, …)`
  para `Math.max(15/60, …)`, garantindo o mínimo de 15 min mesmo via chamada direta à API.
- `lib/supabase-cron.ts` — `CRON_DEFS.automation` mantido em `*/15 * * * *` /
  `automation-check-every-15min`; `LEGACY_JOB_NAMES` inclui `automation-check-every-5min`
  para remover o job de 5 min que chegou a ser criado durante a investigação.
- `docs/supabase-cron-setup.sql` — seção 3 documenta 15 min e o intervalo mínimo do admin.

**Reconciliação do banco**: `lib/supabase-cron.ts` é a fonte versionada dos crons. Em produção
o banco é reconciliado pelo `ensureCrons` quando o admin abre o **DbUpdateModal** após o deploy
na Vercel — nunca via SQL direto. Durante a investigação o banco chegou a ficar com um job
`automation-check-every-5min`; como esse nome está agora em `LEGACY_JOB_NAMES`, o `ensureCrons`
o removerá e (re)criará o `automation-check-every-15min` automaticamente.

## Como reproduzir (antes da correção)
1. Em `/admin/artigos`, ativar a automação com intervalo "a cada 5 minutos".
2. Aguardar e observar `automation_logs`.
3. **Esperado** (na época): execução a cada ~5 min. **Real**: execução a cada 15 min.

## Como verificar (após a correção)
- [x] `INTERVAL_OPTIONS` começa em "A cada 15 minutos"
- [x] Clamp do backend impõe mínimo de 15 min (`15/60`)
- [x] `CRON_DEFS.automation` = `*/15 * * * *`, jobName `automation-check-every-15min`
- [x] `automation-check-every-5min` em `LEGACY_JOB_NAMES`
- [x] `docs/supabase-cron-setup.sql` reflete 15 min
- [x] `npm run build` passa
- [x] `npm run lint` limpo
- [ ] Após deploy: admin abre o DbUpdateModal → `ensureCrons` deixa só `automation-check-every-15min`

## Lições aprendidas
1. **Granularidade do agendador limita o intervalo mínimo efetivo.** Um cron-checker que delega
   "é hora?" a um campo `next_run_at` só honra intervalos ≥ o próprio tick. A opção escolhida
   foi alinhar a UI ao tick (mínimo 15 min) em vez de acelerar a cron, porque acelerar exporia
   um risco de concorrência.
2. **Concorrência: `next_run_at` é gravado ao FIM do ciclo.** Reduzir o tick abaixo da duração
   típica do pipeline geraria ciclos sobrepostos e posts duplicados, pois não há lock/flag de
   "em execução". Esse é o motivo de fundo para manter o mínimo em 15 min. (Se um dia for preciso
   intervalo menor, primeiro adicionar reserva de slot no início do ciclo ou advisory lock.)
3. **Crons são estrutura versionada, igual ao schema.** A correção vive no código
   (`lib/supabase-cron.ts`) e chega ao banco de produção via DbUpdateModal — nunca via SQL
   direto no banco. Ver `docs/bugs/banco-desatualizado-modal-nao-detecta-drift.md`.
