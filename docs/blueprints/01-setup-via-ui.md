# Blueprint 01 — Setup self-service via UI

> **Stack-alvo:** Next.js (App Router) · Drizzle · Supabase (Postgres) · Vercel.
> **Objetivo:** instalar o projeto sem ninguém editar variáveis de ambiente à mão.
> Um wizard guiado coleta credenciais, grava as env vars na Vercel via API e dispara
> o redeploy. Depois de instalado, o setup se auto-bloqueia.

---

## Conceito-chave

A aplicação detecta se está instalada **pela ausência de `DATABASE_URL`** no ambiente.
Sem ela, todo acesso ao admin é redirecionado para `/setup`. O wizard, ao finalizar,
**escreve as env vars no projeto da Vercel** (incluindo a própria `DATABASE_URL`) e
**dispara um redeploy** — o novo deploy sobe já com o ambiente configurado, e o gate
passa a bloquear `/setup`. É instalação "one-shot": funciona uma vez e se tranca.

O segredo é que o projeto **já está hospedado na Vercel** antes do setup rodar (deploy
inicial sem env vars). O wizard usa um **Vercel Access Token** fornecido pelo usuário
para escrever as variáveis e redesployar via API.

---

## Gate de instalação (`middleware.ts`)

```
Sem DATABASE_URL  + rota /admin|/api/admin   → redirect 302 para /setup
Com DATABASE_URL  + rota /setup              → redirect 302 para /admin (bloqueia)
matcher: ['/admin/:path*', '/api/admin/:path*', '/setup', '/setup/:path*']
```

**Invariante:** a única fonte de verdade de "está instalado?" é `process.env.DATABASE_URL`.
Não crie flag em banco para isso — o banco só existe depois que a `DATABASE_URL` existe.

---

## Pré-requisitos de ambiente

O deploy inicial (antes do setup) precisa ter, no mínimo, estas variáveis presentes —
a Vercel as injeta automaticamente quando o projeto está conectado:

| Variável | Origem | Uso no setup |
|---|---|---|
| `VERCEL_PROJECT_ID` | Injetada pela Vercel | Alvo das chamadas de API (env + redeploy) |
| `VERCEL_TEAM_ID` | Injetada pela Vercel (se em team) | Query param `teamId` nas chamadas |

Se `VERCEL_PROJECT_ID` não existir, `install` falha com erro explícito — o projeto
**precisa** estar hospedado na Vercel.

---

## Wizard — 6 steps (client component)

`app/setup/page.tsx` é um client component com máquina de estado de 6 passos:

| Step | Nome | O que faz |
|---|---|---|
| 1 | Vercel | Coleta o Access Token; valida via `verify-vercel` (retorna `projectId`/`teamId`) |
| 2 | Supabase | Coleta URL do projeto, senha do banco, connection string e service role key |
| 3 | Banco de dados | Tela de loading; só avança (migrations rodam dentro de `install`) |
| 4 | Administrador | Coleta nome/email/senha do admin master |
| 5 | Finalizando | Dispara `install`; mostra spinner; faz polling de `deploy-status` |
| 6 | Concluído | Mostra credenciais + warnings + link para `/admin/login` |

### Inteligência do Step 2 (a parte que importa)

O objetivo é **gerar a connection string sozinho** sempre que possível, para o usuário
só colar a senha:

1. **Extrair `projectId`** da URL do Supabase via regex
   `https://([a-z0-9]+)\.supabase\.co`.
2. **Auto-detectar a região** chamando `GET https://api.supabase.com/v1/projects/{id}`
   (campo `region`). Roda no `onBlur` do campo de URL.
3. **Montar a connection string** (Session Pooler):
   `postgresql://postgres.{projectId}:{senhaUrlEncoded}@aws-0-{region}.pooler.supabase.com:5432/postgres`.
4. **Fallback manual:** se a região não for detectada, exibir link direto para a tela
   de conexão do Supabase (`/project/{id}?showConnect=true&connectTab=direct&method=session`)
   e deixar o usuário colar a string; ainda assim injetar a senha url-encoded nos
   placeholders `[YOUR-PASSWORD]`/`[PASSWORD]`.

**Invariante:** senha **sempre** url-encoded (`encodeURIComponent`) — senhas Supabase
contêm caracteres que quebram a URL crua.

---

## Contratos das rotas `/api/setup/*`

Todas são bloqueadas depois da instalação (a presença de `DATABASE_URL` faz o
`install` retornar `403 Already installed`; as demais ficam inalcançáveis pelo gate).

### `POST /api/setup/verify-vercel`
```
req:  { token: string }
res:  { valid: boolean, projectId?: string, teamId?: string, error?: string }
```
Valida o token chamando a API da Vercel e resolve o projeto atual.

### `POST /api/setup/test-db`
```
req:  { databaseUrl: string, supabaseUrl: string, serviceRoleKey: string }
res:  { ok: boolean, error?: string }
```
Abre uma conexão `postgres` de teste (`max: 1`, `connect_timeout` curto) e fecha.
Não escreve nada — só confirma que as credenciais conectam.

### `POST /api/setup/install`  ← peça central
```
req:  { vercelToken, databaseUrl, supabaseUrl, serviceRoleKey,
        adminName, adminEmail, adminPassword, appUrl? }
res:  { deploymentId: string, warnings: string[] }   | { error: string }
guard: se process.env.DATABASE_URL já existe → 403 { error: 'Already installed' }
```
Sequência interna (ordem importa):
1. **Conectar** ao banco com a `databaseUrl` recebida (cliente dedicado `max:1`).
2. **Rodar `SETUP_SQL`** — o schema completo idempotente (ver Blueprint 03).
3. **Provisionar crons** via `ensureCrons({ client, appUrl, serviceKey })` — o **mesmo**
   reconciliador usado nas atualizações (paridade setup ⟺ update). Passe
   `client`/`appUrl`/`serviceKey` **explicitamente**: `process.env` ainda não existe
   neste request.
4. **Criar admin** (`INSERT ... ON CONFLICT (email) DO NOTHING`, senha já hasheada).
5. **Gerar secrets**: `JWT_SECRET` e `CRON_SECRET` = `randomBytes(32).toString('base64')`.
6. **Resolver a URL pública**: usa `appUrl` do body ou deriva do alias de produção via
   `GET /v9/projects/{id}` (`targets.production.alias`).
7. **Gravar env vars** via `POST /v10/projects/{id}/env`:
   `DATABASE_URL` (encrypted), `NEXT_PUBLIC_SUPABASE_URL` (plain),
   `SUPABASE_SERVICE_ROLE_KEY` (encrypted), `JWT_SECRET` (encrypted),
   `CRON_SECRET` (encrypted), `NEXT_PUBLIC_APP_URL` (plain, se resolvida);
   target `['production','preview']`.
8. **Buscar último deployment** (`GET /v6/deployments?projectId=...&limit=1`) para usar
   como base.
9. **Disparar redeploy** (`POST /v13/deployments` com `deploymentId`, `name`,
   `target: 'production'`) e retornar o id do novo deploy.

**`warnings`** acumula avisos não-fatais (ex.: crons não agendadas por falta de URL
pública, extensão pg_cron/pg_net não habilitável) — mostrados no step 6 sem abortar.

### `GET /api/setup/deploy-status?deploymentId=...&vercelToken=...`
```
res:  { state: 'READY' | 'ERROR' | 'CANCELED' | 'BUILDING' | ..., url?: string }
```
O wizard faz polling a cada ~3s. `READY` → step 6 com link do deploy. `ERROR`/`CANCELED`
→ mensagem orientando redeploy manual (as env vars **já foram salvas**).

---

## Invariantes (regras invioláveis)

1. **`DATABASE_URL` é a flag de instalação.** Nunca use banco para detectar instalação.
2. **Senha sempre url-encoded** ao montar/injetar connection string.
3. **`install` é idempotente o suficiente** para ser re-executado: `SETUP_SQL` usa
   `IF NOT EXISTS`, admin usa `ON CONFLICT DO NOTHING`, env vars podem ser sobrescritas.
4. **Nunca logar** `vercelToken`, `serviceRoleKey`, `databaseUrl`, secrets gerados ou
   senha do admin — nem em console, nem na resposta HTTP.
5. **`ensureCrons` no install recebe contexto explícito** (`client`/`appUrl`/`serviceKey`)
   — `process.env` ainda não está populado durante o setup.
6. **Token Vercel é efêmero**: usado só durante o setup, nunca persistido.

---

## Armadilhas conhecidas

- **`process.env` vazio no `install`.** Toda função que normalmente lê de `process.env`
  (conexão, cron, app URL) precisa aceitar parâmetros injetados nesse fluxo.
- **Projeto Supabase novo só tem pooler.** A connection string montada usa o host do
  pooler; a conexão direta (`db.{id}.supabase.co:5432`) pode não resolver via DNS — o
  fallback para pooler vive no Blueprint 02 (`withMigrationClient`).
- **URL pública indisponível** → crons não agendam. Não é fatal: vira `warning` e o admin
  resolve depois atualizando o banco pelo painel (Blueprint 02), que deriva a URL do
  próprio request.
- **`VERCEL_PROJECT_ID` ausente** → `install` falha. O projeto precisa estar na Vercel.

---

## Checklist de implementação

- [ ] `middleware.ts` com o duplo gate (sem `DATABASE_URL`→/setup; instalado→bloqueia /setup) e o `matcher` correto.
- [ ] `app/setup/page.tsx` — wizard de 6 steps com a máquina de estado e o Step 2 inteligente (extrai projectId, detecta região, monta connection string, injeta senha url-encoded).
- [ ] `POST /api/setup/verify-vercel` — valida token, resolve projectId/teamId.
- [ ] `POST /api/setup/test-db` — conexão de teste read-only.
- [ ] `POST /api/setup/install` — sequência de 9 passos acima, com guard `Already installed` e `warnings`.
- [ ] `GET /api/setup/deploy-status` — proxy de status do deploy para polling.
- [ ] `SETUP_SQL` idempotente disponível (Blueprint 03).
- [ ] `ensureCrons` aceitando contexto explícito (Blueprint 03).
- [ ] Nenhum secret logado em nenhuma das rotas.
