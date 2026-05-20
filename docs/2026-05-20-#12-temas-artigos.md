# Módulo de Temas para Artigos

## Visão Geral

Implementação da seção **Temas** dentro do sidebar de Artigos do painel administrativo. Permite pesquisar sugestões de temas de artigos via IA ou cadastrá-los manualmente, criando um banco de ideias organizado por origem (IA ou manual) e status (pendente ou usado).

---

## Funcionalidades

- **Pesquisa de temas com IA**: Botão que envia o briefing do cliente para a LLM via OpenRouter e recebe de volta entre 10 e 20 sugestões de temas relevantes, atuais e alinhados com o negócio
- **Cadastro manual**: Modal para adicionar temas manualmente com título e descrição opcional
- **Edição**: Modal de edição para ajustar título e descrição de qualquer tema
- **Exclusão**: Botão de exclusão com confirmação para remover temas
- **Badges visuais**: Cada tema exibe badges de origem (IA roxo / Manual azul) e status (Pendente amarelo / Usado verde)
- **Contador**: Exibe total de temas cadastrados
- **Feedback visual**: Loading spinner durante operações, toasts de sucesso/erro

---

## Estrutura do Banco de Dados

### Tabela `article_themes`

```sql
CREATE TABLE IF NOT EXISTS article_themes (
  id serial PRIMARY KEY NOT NULL,
  title text NOT NULL,
  description text,
  source text DEFAULT 'manual' NOT NULL,   -- 'manual' | 'ai'
  status text DEFAULT 'pending' NOT NULL,   -- 'pending' | 'used'
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS article_themes_status_idx ON article_themes (status);
```

### Schema Drizzle (`drizzle/schema.ts`)

```typescript
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

export type ArticleTheme = typeof articleThemes.$inferSelect
export type NewArticleTheme = typeof articleThemes.$inferInsert
```

---

## API REST

### `GET /api/admin/themes`

Retorna todos os temas ordenados por data de criação (mais recentes primeiro).

**Resposta:**
```json
{
  "themes": [
    {
      "id": 1,
      "title": "Como a IA está transformando o marketing digital",
      "description": "Explorar o impacto da IA...",
      "source": "ai",
      "status": "pending",
      "created_at": "2026-05-20T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

### `POST /api/admin/themes`

**Criar tema manual:**
```json
{
  "title": "Título do tema",
  "description": "Descrição opcional"
}
```

**Gerar temas com IA:**
```json
{
  "action": "generate",
  "customContext": "Contexto adicional opcional"
}
```

A geração com IA busca o briefing da empresa na tabela `site_settings` (key `briefing_content`), envia para a LLM com um prompt especializado em marketing de conteúdo, parseia o JSON retornado e insere todos os temas de uma vez com `source: 'ai'`.

### `PUT /api/admin/themes`

Atualiza um tema existente.

```json
{
  "id": 1,
  "title": "Novo título",
  "description": "Nova descrição",
  "status": "used"
}
```

### `DELETE /api/admin/themes?id=1`

Exclui um tema pelo ID (query parameter).

---

## Arquivos Criados

| Arquivo | Descrição |
|---|---|
| `app/api/admin/themes/route.ts` | API REST completa (GET, POST, PUT, DELETE) com geração de temas via IA |

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `drizzle/schema.ts` | Adicionada tabela `articleThemes` com tipos exportados |
| `lib/ai.ts` | Adicionado `theme_suggestion` ao `DEFAULT_MODELS` |
| `app/admin/configuracoes/ConfiguracoesClient.tsx` | Adicionado label `theme_suggestion: 'Sugestão de Temas'` no `FEATURE_LABELS` |
| `app/admin/artigos/ArtigosClient.tsx` | Adicionado componente `TemasSection` com CRUD completo de temas + geração via IA |

---

## Integração com IA (OpenRouter)

A feature usa a chave `theme_suggestion` no sistema de IA do projeto:

1. **Modelo padrão**: `openai/gpt-4o-mini` (configurável em Configurações → IA)
2. **API key**: L automaticamente de `site_settings` (key `ai_api_key`)
3. **Fluxo**: O briefing do cliente é recuperado do banco → enviado junto com um system prompt especialista em marketing de conteúdo → a LLM retorna um JSON array de temas → os temas são parseados e inseridos no banco

### System Prompt utilizado

```
Você é um especialista em marketing de conteúdo e estratégia digital. Sua tarefa é sugerir
temas de artigos quentes, relevantes e em alta para blogs corporativos.

Regras:
- Os temas devem ser específicos e acionáveis (não genéricos)
- Devem considerar tendências atuais do mercado
- Devem ser relevantes para o público-alvo identificado no briefing
- Devem estar alinhados com os produtos/serviços da empresa
- Devem ter potencial de SEO e engajamento
- Responda SOMENTE com o JSON array, sem texto adicional, sem markdown, sem ```json
- Cada tema deve ter um title claro e uma description explicando a relevância
```

---

## Fluxo de Uso

1. Admin acessa **Artigos → Temas** no painel
2. Clica em **"Pesquisar Temas com IA"** ou **"Adicionar Manualmente"**
3. Se IA: o sistema busca o briefing, envia para a LLM, salva as sugestões automaticamente
4. Os temas aparecem na lista com badges de origem e status
5. Admin pode editar ou excluir qualquer tema
6. Os temas ficam disponíveis como referência na hora de criar novos artigos

---

## Prompt para Replicar em Outros Projetos

> **Contexto**: Tenho um blog/painel administrativo construído com Next.js 14 App Router, TypeScript, Tailwind CSS, Drizzle ORM e PostgreSQL (Supabase). O projeto já possui um sistema de IA configurado via OpenRouter (`lib/ai.ts`) com a função `aiChat(feature, messages, options)` que resolve automaticamente a API key e o modelo do banco. Também já existe uma tabela `site_settings` que armazena configurações como briefing do cliente (key `briefing_content`). As páginas admin são client components que se comunicam com APIs REST em `app/api/admin/*`.
>
> **Tarefa**: Implemente um módulo completo de **Temas para Artigos** (Article Themes) seguindo exatamente esta especificação:
>
> ### 1. Schema do Banco
> Crie uma tabela `article_themes` com os campos:
> - `id` (serial, PK)
> - `title` (text, NOT NULL)
> - `description` (text, nullable)
> - `source` (text, NOT NULL, default `'manual'`) — valores: `'manual'` ou `'ai'`
> - `status` (text, NOT NULL, default `'pending'`) — valores: `'pending'` ou `'used'`
> - `created_at` (timestamp, NOT NULL, default now())
> - Índice em `status`
>
> Adicione no schema do Drizzle e exporte os tipos `ArticleTheme` e `NewArticleTheme`.
>
> ### 2. API REST (`app/api/admin/themes/route.ts`)
> - **GET**: Lista todos os temas ordenados por `created_at` DESC. Retorna `{ themes, total }`.
> - **POST (manual)**: Recebe `{ title, description }`. Cria tema com `source: 'manual'`, `status: 'pending'`. Retorna `{ theme }`.
> - **POST (geração IA)**: Recebe `{ action: 'generate', customContext? }`. Busca o briefing em `site_settings`. Envia para a IA via `aiChat('theme_suggestion', messages, { max_tokens: 4096, temperature: 0.8 })`. O system prompt deve pedir que a IA atue como especialista em marketing de conteúdo e retorne SOMENTE um JSON array com objetos `{ title, description }`. Parseia a resposta (tratando markdown code blocks), insere todos com `source: 'ai'` e retorna `{ themes, total }`.
> - **PUT**: Recebe `{ id, title?, description?, status? }`. Atualiza o tema. Retorna `{ theme }`.
> - **DELETE**: Recebe `id` como query param. Remove o tema. Retorna `{ ok: true }`.
> - Todas as rotas com try/catch retornando erros JSON apropriados.
>
> ### 3. Configuração de IA
> - Adicione `theme_suggestion: 'openai/gpt-4o-mini'` no mapa de modelos padrão (`DEFAULT_MODELS` em `lib/ai.ts`).
> - Adicione o label `theme_suggestion: 'Sugestão de Temas'` na tela de configurações de IA (para aparecer no seletor de modelos por feature).
>
> ### 4. Interface (Componente React)
> Crie um componente `TemasSection` (client component) com:
> - **Estado**: `themes`, `loading`, `generating`, `showAddModal`, `showEditModal`, `editTheme`, `newTitle`, `newDescription`, `deleting`, `toast`.
> - **useEffect** para buscar temas na montagem via `fetch('/api/admin/themes')`.
> - **Botão "Pesquisar Temas com IA"**: chama POST `{ action: 'generate' }`, mostra spinner durante a requisição, exibe toast de sucesso com a quantidade de temas gerados.
> - **Botão "Adicionar Manualmente"**: abre modal com campos de título e descrição, chama POST manual.
> - **Lista de temas**: cada tema como card com badges de origem (IA roxo / Manual azul) e status (Pendente amarelo / Usado verde), título, descrição, data formatada, botões de editar e excluir.
> - **Modal de edição**: preenche campos com dados do tema, chama PUT.
> - **Exclusão**: confirmação via `confirm()`, chama DELETE.
> - **Toasts**: feedback visual de sucesso (verde) ou erro (verde) em cada operação.
> - **Empty state**: mensagem "Nenhum tema cadastrado..." quando a lista está vazia.
> - **Estilo**: Tailwind CSS com cores customizadas do projeto (`brand-primary`, `brand-primary-dark`, `neutral-900`). Cards com bordas arredondadas, hover suave.
>
> ### 5. Integração na Página de Artigos
> Adicione a seção "Temas" (com ícone 💡) no sidebar de navegação da página de artigos do admin. Renderize `<TemasSection />` quando a seção estiver ativa.
>
> ### 6. Aplicar no Banco
> Após criar o schema, aplique as mudanças no banco com `npm run db:push` (ou o comando equivalente de migration do projeto). Se o comando exigir TTY interativo, crie a tabela diretamente via SQL.
>
> **Importante**: Use as mesmas convenções do projeto existente (imports com `@/`, Tailwind, server components quando possível, client components para interatividade). Siga o padrão de erro handling com try/catch e NextResponse.json. Não crie testes.
