# #10 - Sistema de Analytics com Dashboard e Gráficos Chart.js

## Visão Geral

Implementação completa de um sistema de analytics próprio (sem dependências externas como Google Analytics) que rastreia page views, visitantes únicos, artigos mais vistos, horários de pico, dias da semana com mais acessos, origem do tráfego e tipos de página visitados. Os dados são exibidos em dois dashboards com gráficos interativos usando Chart.js.

---

## Stack Utilizada

| Tecnologia | Uso |
|---|---|
| PostgreSQL (Supabase) | Tabela `page_views` para armazenar cada visualização |
| Drizzle ORM | Schema definition, migrations, tracking endpoint |
| postgres.js (client direto) | Queries de agregação na API de analytics |
| Chart.js + react-chartjs-2 | Gráficos interativos (Line, Bar, Doughnut) |
| Next.js API Routes | `/api/track` (registro) e `/api/admin/analytics` (leitura) |
| React Client Components | DashboardClient e AnalyticsClient |

---

## Arquitetura

```
Visitante acessa página pública
         │
         ▼
AnalyticsTracker (client component)
  Detecta mudança de rota via usePathname()
  Envia POST /api/track com { path, referrer }
         │
         ▼
POST /api/track
  1. Ignora /admin e /api
  2. Cria fingerprint IP+path
  3. Deduplica: mesma pessoa+path em 5min = ignora
  4. Resolve slug de artigo → busca post_id/title
  5. INSERT na tabela page_views
         │
         ▼
GET /api/admin/analytics?period=30d
  13 queries SQL em paralelo (Promise.all)
  Usa postgres.js diretamente (não Drizzle)
  Retorna JSON com todos os dados agregados
         │
         ▼
DashboardClient / AnalyticsClient
  Consome API e renderiza gráficos Chart.js
```

---

## Arquivos Criados / Modificados

### Novos Arquivos

| Arquivo | Descrição |
|---|---|
| `components/blog/AnalyticsTracker.tsx` | Client component que trackeia cada pageview |
| `app/api/track/route.ts` | API pública POST para registrar page views |
| `app/api/admin/analytics/route.ts` | API admin GET com todas as agregações |
| `app/admin/DashboardClient.tsx` | Dashboard principal com gráficos Chart.js |
| `app/admin/analytics/AnalyticsClient.tsx` | Página completa de analytics |
| `app/admin/analytics/page.tsx` | Wrapper server component para AnalyticsClient |

### Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `drizzle/schema.ts` | Adicionadas tabelas `page_views` e `api_tokens` |
| `drizzle/db.ts` | Exportado `client` (postgres.js) além de `db` (Drizzle) |
| `app/(public)/layout.tsx` | Importado e renderizado `<AnalyticsTracker />` |
| `app/admin/page.tsx` | Substituído server component por `<DashboardClient />` |
| `app/admin/layout.tsx` | Adicionado item "Analytics" no menu lateral |
| `package.json` | Adicionados `chart.js` e `react-chartjs-2` |

---

## Banco de Dados

### Tabela `page_views`

```sql
CREATE TABLE page_views (
  id         serial PRIMARY KEY NOT NULL,
  path       text NOT NULL,              -- URL path visitada (ex: "/meu-artigo")
  post_id    integer REFERENCES posts(id) ON DELETE SET NULL,
  post_slug  text,                        -- Slug do artigo (denormalizado)
  post_title text,                        -- Título do artigo (denormalizado)
  referrer   text,                        -- HTTP Referer header
  user_agent text,                        -- Browser user agent
  ip         text,                        -- Fingerprint: IP + path
  visited_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX page_views_visited_at_idx ON page_views (visited_at);
CREATE INDEX page_views_post_id_idx ON page_views (post_id);
CREATE INDEX page_views_path_idx ON page_views (path);
```

---

## Endpoints

### `POST /api/track` (público)

Registra um page view.

**Request body:**
```json
{
  "path": "/meu-artigo",
  "referrer": "https://google.com/search?q=..."
}
```

**Comportamento:**
- Ignora paths que começam com `/admin` ou `/api`
- Deduplicação: mesmo IP+path nos últimos 5 minutos = ignorado
- Resolve automaticamente slugs de artigos (1 segmento no path)
- Salva `post_id`, `post_slug`, `post_title` se for um artigo

### `GET /api/admin/analytics?period=30d` (protegido)

Retorna todos os dados agregados de analytics.

**Parâmetros:** `period` = `7d` | `30d` | `90d` | `365d`

**Response JSON:**
```json
{
  "period": "30d",
  "days": 30,
  "totalViews": 1234,
  "uniqueVisitors": 567,
  "prevTotalViews": 890,
  "prevUniqueVisitors": 400,
  "topPosts": [...],
  "viewsByDay": [...],
  "viewsByHour": [...],
  "viewsByWeekday": [...],
  "referrers": [...],
  "pageTypes": [...],
  "todayViews": 45,
  "yesterdayViews": 38,
  "onlineNow": 3
}
```

**13 queries executadas em paralelo:**

| # | Query | Descrição |
|---|---|---|
| 1 | `totalViews` | Total de views no período |
| 2 | `uniqueVisitors` | Visitantes únicos (distinct ip) |
| 3 | `prevTotalViews` | Views do período anterior (para comparação) |
| 4 | `prevUniqueVisitors` | Unicos do período anterior |
| 5 | `topPosts` | Top 10 artigos mais vistos |
| 6 | `viewsByDay` | Views + unicos agrupados por dia |
| 7 | `viewsByHour` | Views agrupados por hora (0-23) |
| 8 | `viewsByWeekday` | Views agrupados por dia da semana (0=Domingo) |
| 9 | `referrers` | Top 10 origens de tráfego |
| 10 | `pageTypes` | Distribuição por tipo (Home/Artigo/Categoria/Tag/Busca) |
| 11 | `todayViews` | Views hoje |
| 12 | `yesterdayViews` | Views ontem |
| 13 | `onlineNow` | Views nos últimos 5 minutos |

---

## Dashboard `/admin` — Componentes Visuais

### 6 KPI Cards (linha superior)

| Card | Dados | Variação |
|---|---|---|
| Views | Total de pageviews | vs período anterior (% verde/vermelho) |
| Unicos | Visitantes únicos | vs período anterior |
| Hoje | Views do dia | vs ontem |
| Média/dia | TotalViews / dias | - |
| Online | Views últimos 5 min | Indicador pulsante verde |
| Pgs/Visitante | TotalViews / Unicos | Profundidade de navegação |

### 4 Blog Stats Cards (segunda linha)
- Publicados, Rascunhos, Categorias, Tags

### Gráficos

| Gráfico | Tipo | Descrição |
|---|---|---|
| Tendência de acessos | Line (area) | Views e únicos por dia |
| Acessos por hora | Bar | 24h, pico em laranja |
| Acessos por dia da semana | Bar | 7 dias, pico em laranja |
| Artigos mais vistos | Bar horizontal | Top 10 |
| Tipos de página | Doughnut | Home/Artigo/Categoria/Tag/Busca |
| Origem do tráfego | Barras CSS | Top referrers com % |

### Seletor de Período
Botões toggle: 7d / 30d / 90d / 12m

---

## Página `/admin/analytics` — Analytics Completo

Versão expandida do dashboard com:
- 4 KPI cards maiores
- Gráfico de tendência diária (maior, 72h de altura)
- Gráficos de hora e dia da semana lado a lado
- Top artigos (horizontal, 80h)
- Doughnut de tipos de página
- Origem do tráfego com barras de progresso
- **Tabela detalhada** com resumo por dia (Data, Views, Únicos, Views/Únicos)

---

## Detalhes Técnicos Importantes

### 1. Por que `postgres.js` direto em vez de Drizzle na API de analytics

O Drizzle ORM com `db.execute()` e `sql` tag não serializa objetos `Date` corretamente quando `prepare: false` está configurado. O postgres.js com tagged template literals (`client\`...\``) lida com parâmetros automaticamente, mas exige que datas sejam passadas como ISO string com cast `::timestamp`:

```typescript
// Funciona
const since = new Date(...).toISOString()
await client`SELECT * FROM page_views WHERE visited_at >= ${since}::timestamp`

// NÃO funciona com prepare: false
await db.execute(sql`SELECT * FROM page_views WHERE visited_at >= ${new Date(...)}`)
```

### 2. Por que `toISOString()` + `::timestamp`

O postgres.js com `prepare: false` serializa parâmetros como strings. Sem o cast `::timestamp`, o PostgreSQL não converte automaticamente a string ISO para timestamp, causando erro de tipo.

### 3. Deduplicação de page views

O tracking usa fingerprint `IP + path` com janela de 5 minutos. Se o mesmo visitante (mesmo IP) acessar a mesma URL dentro de 5 minutos, o hit é ignorado.

### 4. Resolução automática de artigos

Ao registrar um page view, o endpoint verifica se o path tem exatamente 1 segmento (ex: `/meu-artigo`). Se sim, busca na tabela `posts` por slug e preenche `post_id`, `post_slug` e `post_title` automaticamente.

---

## Dependências Instaladas

```json
{
  "chart.js": "^4.x",
  "react-chartjs-2": "^5.x"
}
```

---

## Lições Aprendidas / Pitfalls

1. **Drizzle `sql` tag + `prepare: false`**: Não passa objetos Date como parâmetros PostgreSQL. Usar `toISOString()` + cast `::timestamp`.

2. **SWC + Template literals aninhados**: O compilador SWC do Next.js tem problemas com template literals JavaScript (`${var}`) em arquivos que também usam template literals do Drizzle (`sql\`...\``). Solução: evitar template literals JS fora de `sql` tags nesses arquivos, usar concatenação de strings.

3. **Migrations Drizzle**: `drizzle-kit migrate` pode falhar silenciosamente. Sempre verificar se a tabela foi criada. Usar `drizzle-kit push` ou criar manualmente se necessário.

4. **`Promise.all` com pool `max: 1`**: Funciona porque postgres.js enfileira as queries sequencialmente no único connection. Mas para analytics com 13 queries pesadas, considere aumentar o pool se performance for crítica.

---

## Prompt para Implementação

> Copie o prompt abaixo e cole em uma nova sessão do Claude Code / Cursor / Windsurf para implementar este sistema em outro projeto Next.js:

---

```
Implemente um sistema completo de analytics em meu blog Next.js 14 (App Router) com as seguintes características:

## Stack
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Drizzle ORM com PostgreSQL (Supabase) e postgres.js
- chart.js + react-chartjs-2 para gráficos

## Requisitos

### 1. Tabela page_views no Drizzle schema
Campos: id (serial PK), path (text), post_id (integer FK → posts, SET NULL), post_slug (text), post_title (text), referrer (text), user_agent (text), ip (text), visited_at (timestamp default now())
Índices em: visited_at, post_id, path
Também exporte o client postgres.js do db.ts (além do db Drizzle)

### 2. Tracking endpoint: POST /api/track (público)
- Recebe { path, referrer } no body
- Ignora paths /admin e /api
- Fingerprint por IP+path, deduplica hits em 5 minutos
- Se o path tem 1 segmento, busca na tabela posts por slug e salva post_id/slug/title
- Registra na tabela page_views

### 3. Analytics API: GET /api/admin/analytics?period=30d (protegido por middleware)
- Use o client postgres.js DIRETAMENTE (não Drizzle db.execute) para evitar bugs de serialização
- IMPORTANTE: Passe datas como .toISOString() com cast ::timestamp no SQL (ex: ${since}::timestamp)
- 13 queries em Promise.all:
  - totalViews, uniqueVisitors, prevTotalViews, prevUniqueVisitors
  - topPosts (top 10), viewsByDay (com unique), viewsByHour (0-23), viewsByWeekday (0-6)
  - referrers (top 10, usa split_part), pageTypes (CASE WHEN para Home/Artigo/Categoria/Tag/Busca)
  - todayViews, yesterdayViews, onlineNow (5 min)
- Aceita period: 7d, 30d, 90d, 365d

### 4. Componente AnalyticsTracker
- 'use client', usa usePathname() com useEffect
- Envia POST /api/track com path e document.referrer
- Debounce de 300ms
- Adicionar no layout público (app/(public)/layout.tsx)

### 5. Dashboard principal (/admin) - DashboardClient.tsx
- Client component com Chart.js (Line, Bar, Doughnut)
- Seletor de período (7d/30d/90d/12m)
- 6 KPI cards: Views (com % vs anterior), Unicos, Hoje (vs ontem), Média/dia, Online agora (5 min), Páginas/visitante
- 4 blog stat cards: Publicados, Rascunhos, Categorias, Tags
- Gráfico de linha: tendência diária (views + únicos com area fill)
- Gráfico de barras: acessos por hora (pico em laranja)
- Gráfico de barras: acessos por dia da semana (pico em laranja)
- Gráfico horizontal: top 10 artigos mais vistos
- Doughnut: tipos de página
- Barras CSS: origem do tráfego (referrers com %)
- Link "Ver analytics completo →" para /admin/analytics

### 6. Página Analytics completa (/admin/analytics)
- Mesma estrutura mas maior, com tabela detalhada por dia (Data, Views, Únicos, Views/Únicos)
- Gráficos maiores

### 7. Admin layout
- Adicionar item "Analytics" (📈) no menu lateral entre Dashboard e Artigos

### 8. Instalar dependências
npm install chart.js react-chartjs-2

### 9. Gerar e aplicar migration
npx drizzle-kit generate && npx drizzle-kit migrate

### Pitfalls a evitar:
- NÃO usar db.execute() do Drizzle para queries com parâmetros Date → usar client postgres.js direto com .toISOString() + ::timestamp
- NÃO usar template literals JavaScript (`${}`) em arquivos que têm sql`` tags do Drizzle → SWC quebra. Usar concatenação de strings
- Em listas .map() com dados potencialmente duplicados, usar key={index} em vez de key={dado}
- Na API de analytics, usar export const dynamic = 'force-dynamic'
```
