# Blueprint 02 — Atualização de banco via UI

> **Stack-alvo:** Next.js (App Router) · Drizzle · Supabase (Postgres) · Vercel.
> **Objetivo:** manter o banco em produção sincronizado com o código **sem rodar
> `db:migrate` manualmente**. Um modal no admin detecta o que está faltando (tabelas,
> colunas, crons) e aplica de forma idempotente via streaming.

---

## Conceito-chave

Produção **não** roda `drizzle-kit migrate`. Em vez disso:

1. As migrations são **embutidas no bundle como strings** (o filesystem da Vercel não
   serve os `.sql` em runtime).
2. A cada render do layout admin, o servidor **detecta drift real** comparando o banco
   contra a lista de tabelas/colunas esperadas — não confia apenas no registro de
   migrations aplicadas.
3. Se há pendências, um **modal** ("Atualização necessária") aparece e, ao clicar em
   "Atualizar agora", aplica tudo de forma **idempotente** via **SSE**, mostrando o log
   em tempo real.

Resultado: qualquer banco (vazio, parcial, ou desatualizado) converge para o schema
correto com um clique — sem CLI, sem acesso ao Supabase dashboard.

---

## Migrations embutidas (`lib/migrations-embedded.ts`)

```ts
// GERADO — quando adicionar migration: copie o conteúdo do .sql para cá.
export const EMBEDDED_MIGRATIONS: Record<string, string> = {
  '0000_nome': `CREATE TABLE ... --> statement-breakpoint CREATE TABLE ...`,
  // ...
}
export const MIGRATION_ORDER = ['0000_nome', '0001_...', ...] // ordem de aplicação
```

- **Por quê:** o bundle serverless da Vercel não inclui `drizzle/migrations/*.sql` de
  forma acessível em runtime. Embutir como string garante que o conteúdo viaje no bundle.
- `MIGRATION_ORDER` é a ordem canônica de aplicação (ver Blueprint 03 para a paridade).
- Cada string usa `--> statement-breakpoint` como separador (formato do drizzle-kit).

---

## Detecção de drift (`lib/db-migrations.ts`)

`getDbPendingMigrations(): Promise<string[]>` retorna as tags pendentes. A lógica é mais
esperta que "o que não está em `drizzle_migrations`":

```
1. Curto-circuito: se schemaComplete (flag de processo) === true → retorna []
2. applied = SELECT migration_name FROM drizzle_migrations
   pendingByVersion = MIGRATION_ORDER - applied
3. getMissingTables(): compara contra EXPECTED_TABLES via information_schema.
   Se faltar QUALQUER tabela → retorna MIGRATION_ORDER inteiro (re-aplica tudo idempotente)
4. hasMissingColumns(): compara contra EXPECTED_COLUMNS (pares table+column críticos).
   Se faltar QUALQUER coluna → retorna MIGRATION_ORDER inteiro
5. Se pendingByVersion vazio E nada faltando → schemaComplete = true; retorna []
6. Senão → retorna pendingByVersion
```

**Por que verificar tabelas/colunas e não só `drizzle_migrations`?** Um banco pode ter
o registro de migration mas não a tabela (restore parcial, banco recriado, drift manual).
A fonte de verdade é o **estado real do schema**, não o livro-razão de migrations.

- `EXPECTED_TABLES`: lista de todas as tabelas que o schema completo deve conter.
- `EXPECTED_COLUMNS`: pares `{ table, column }` de colunas **críticas** adicionadas por
  migrations posteriores (as que, se ausentes, quebram funcionalidades).
- `schemaComplete` é cache **só do estado "completo"** — se há pendência, a flag fica
  `false` e cada chamada reconsulta. Evita query a cada pageview quando já está tudo ok.

---

## Aplicação idempotente

`applyMigration(tag)`:
1. Pega a string de `EMBEDDED_MIGRATIONS[tag]`, faz split por `--> statement-breakpoint`.
2. Para cada statement, aplica `makeIdempotent()` e executa via cliente dedicado.
3. Erros de "objeto já existe" são **ignorados**; qualquer outro erro propaga.
4. Ao final, `INSERT INTO drizzle_migrations (migration_name) ... ON CONFLICT DO NOTHING`.

### `makeIdempotent(stmt)` — reescrita de DDL
```
CREATE TABLE          → CREATE TABLE IF NOT EXISTS
CREATE INDEX          → CREATE INDEX IF NOT EXISTS
CREATE UNIQUE INDEX   → CREATE UNIQUE INDEX IF NOT EXISTS
ADD COLUMN            → ADD COLUMN IF NOT EXISTS
```
(usar negative lookahead para não duplicar `IF NOT EXISTS` quando já presente)

### Códigos PG ignorados (objeto já existe)
```
42P07  duplicate_table
42710  duplicate_object   (ex: constraint, type)
42701  duplicate_column
```
`ADD CONSTRAINT` não tem `IF NOT EXISTS` em Postgres — por isso cada statement roda
isolado e esses códigos são tolerados. **Garante que re-aplicar `MIGRATION_ORDER` inteiro
é seguro.**

---

## Conexão dedicada com fallback (`withMigrationClient`)

Migrations precisam de conexão própria (não o pool da app):
```
cliente: postgres(url, { ssl:{rejectUnauthorized:false}, max:1, prepare:false,
                         connect_timeout:15, idle_timeout:5, max_lifetime:30 })
```
**Fallback direta → pooler:** tenta primeiro a URL **direta**
(`db.{projectId}.supabase.co:5432`, derivada da URL do pooler). Se o DNS falhar
(`ENOTFOUND`/`EAI_AGAIN` — típico de projeto Supabase novo, que só tem pooler), cai de
volta para a URL original (pooler). A conexão direta é preferida quando existe porque
não passa pelo limite de conexões do pooler.

> Em runtime normal, `client` do pool Drizzle é um Proxy não-chamável — só serve para
> `.unsafe()`. Tagged templates `` sql`` `` exigem o `postgres()` real do
> `withMigrationClient`/`withCronClient`.

---

## Contrato SSE — `POST /api/admin/db-migrate`

Rota protegida pelo middleware admin (JWT). `dynamic = 'force-dynamic'`,
`maxDuration = 300`. Retorna `text/event-stream`.

### Shape do evento
```ts
type MigrateEvent =
  | { type: 'migration'; name: string; status: 'applying'|'done'|'skipped' }
  | { type: 'cron'; status: 'applying'|'done'; detail?: string }
  | { type: 'cron-warning'; message: string }
  | { type: 'complete'; message: string }
  | { type: 'error'; name: string; message: string }
```
Frame SSE: `data: ${JSON.stringify(event)}\n\n`.

### Sequência do handler
```
appUrl = getAppUrlFromRequest(req)   // deriva do próprio request — não depende de env
pending = getDbPendingMigrations()
1. se pending.length: ensureMigrationsTable(); para cada tag → applyMigration (emite applying/done; erro → emite error e encerra)
2. SEMPRE: ensureCrons({ appUrl }) → reconcilia crons (Blueprint 03); invalidateCronStatusCache()
   emite cron-warning para extensões faltando ou erros por job; emite cron done com detalhe
3. emite complete ('Banco atualizado com sucesso.' ou 'Crons reconciliadas com sucesso.')
```

**Importante:** `appUrl` vem do **request**, não de `NEXT_PUBLIC_APP_URL`. Uma instalação
nova pode não ter a env configurada ainda, e o admin está acessando justamente pela URL
pública — então ela é a fonte mais confiável aqui.

---

## Gating no admin layout (`app/admin/layout.tsx`)

O layout é Server Component e faz, no SSR (após autenticar o usuário):
```
pendingMigrations = await getDbPendingMigrations()   // catch → MIGRATION_ORDER (mostra modal)
cronsMissing      = (await getDbCronStatus()).missing // catch → [] (não bloqueia)
<DbUpdateModal pending={pendingMigrations} cronsMissing={cronsMissing} />
```
- **Falha-aberto para migrations:** se a checagem lança, assume pendência (mostra modal)
  — melhor pedir atualização do que esconder um banco quebrado.
- **Falha-fechado para crons:** se a checagem de cron lança, assume `[]` — um blip
  transitório não deve disparar modal em todo render.

## Componente `DbUpdateModal` (client)

- Não renderiza nada se `pending` e `cronsMissing` estão vazios, ou se foi dispensado.
- Estados: `idle → running → done | error`.
- Caso especial `__banco_sem_schema__` (marcador): banco existe mas sem nenhuma tabela →
  mensagem "Banco em branco detectado".
- Ao clicar "Atualizar agora": `fetch('/api/admin/db-migrate', { method:'POST' })`, lê o
  stream, faz parse de cada frame `data: ...` e renderiza o log colorido (verde=ação,
  branco=ok, vermelho=erro).
- `done` → botão "Recarregar página" (`window.location.reload()`).
- `error` → botão "Tentar novamente" (volta para `idle`).

---

## Invariantes

1. **Produção nunca roda `db:migrate`.** A atualização é exclusivamente via `DbUpdateModal`
   + `/api/admin/db-migrate`.
2. **Drift é medido pelo schema real** (`information_schema`), não só por
   `drizzle_migrations`.
3. **Toda aplicação é idempotente** — re-aplicar `MIGRATION_ORDER` inteiro é seguro.
4. **`appUrl` da atualização vem do request**, não de env var.
5. **Crons são reconciliadas a cada atualização**, mesmo sem migrations pendentes.
6. **Paridade com o setup:** `applyMigration`/`ensureCrons` são os mesmos mecanismos do
   `install` (Blueprint 01) — não duplique a lógica.

---

## Armadilhas

- **Esquecer de atualizar `EMBEDDED_MIGRATIONS`/`MIGRATION_ORDER`** ao criar migration →
  o `.sql` existe mas o bundle não enxerga → atualização não aplica nada. Ver Blueprint 03.
- **Coluna nova não registrada em `EXPECTED_COLUMNS`** → drift não é detectado em bancos
  que já tinham o registro de migration, e a coluna nunca é criada.
- **Usar o pool da app para migration** → o Proxy não-chamável quebra tagged templates;
  use `withMigrationClient`.
- **Bloquear o admin quando a checagem falha** → use falha-aberto (migrations) /
  falha-fechado (crons) como acima, para não trancar o painel por um blip de DB.

---

## Checklist de implementação

- [ ] `lib/migrations-embedded.ts` com `EMBEDDED_MIGRATIONS` + `MIGRATION_ORDER`.
- [ ] `lib/db-migrations.ts`: `getDbPendingMigrations`, `getMissingTables`/`EXPECTED_TABLES`, `hasMissingColumns`/`EXPECTED_COLUMNS`, flag `schemaComplete`, `applyMigration` + `makeIdempotent` + `ALREADY_EXISTS_CODES`, `ensureMigrationsTable`, `withMigrationClient` (fallback direta→pooler), `getDbCronStatus` + cache TTL + `invalidateCronStatusCache`.
- [ ] `POST /api/admin/db-migrate` — SSE com o shape `MigrateEvent`, `maxDuration 300`, `appUrl` do request.
- [ ] `components/.../DbUpdateModal.tsx` — consumer do SSE com estados idle/running/done/error e caso `__banco_sem_schema__`.
- [ ] `app/admin/layout.tsx` — gating SSR com falha-aberto (migrations) / falha-fechado (crons).
- [ ] Verificar paridade: `applyMigration`/`ensureCrons` reaproveitados pelo `install`.
