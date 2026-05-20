# Infraestrutura de IA via OpenRouter

**Data:** 2026-05-20

## Resumo

Implementação de uma infraestrutura centralizada para uso de IA no blog, utilizando exclusivamente o [OpenRouter](https://openrouter.ai) como gateway para modelos LLM. A configuração da API key e a seleção de modelos por recurso são armazenadas no banco de dados e gerenciadas pelo painel administrativo — **não há dependência de variáveis de ambiente para IA**.

---

## Decisões de design

### Por que OpenRouter?

- Acesso unificado a múltiplos provedores (OpenAI, Anthropic, Google, Meta, etc.) por uma única API compatível com o formato OpenAI
- Possibilidade de trocar o modelo de qualquer recurso sem alterar código
- Preços competitivos e roteamento inteligente

### Por que a API key fica no banco?

- Permite trocar a key sem reiniciar o servidor ou alterar variáveis de ambiente
- O admin pode configurar diretamente pelo painel
- Não exige acesso ao servidor/Vercel para configurar IA

### Por que modelos por recurso?

Cada recurso de IA tem necessidades diferentes. Um recurso de sumarização pode funcionar bem com um modelo rápido e barato, enquanto geração de conteúdo pode se beneficiar de um modelo mais capaz. A configuração por recurso permite esse balanceamento de custo/qualidade.

---

## O que foi implementado

### 1. Módulo central de IA (`lib/ai.ts`)

Arquivo que centraliza toda a comunicação com o OpenRouter. **Qualquer feature de IA deve passar por este módulo.**

| Export | Tipo | Descrição |
|--------|------|-----------|
| `AIFeature` | Type | Union type com as chaves dos recursos de IA (`content_generation`, `title_suggestion`, etc.) |
| `OpenRouterMessage` | Interface | Mensagem do chat (`{ role, content }`) |
| `OpenRouterOptions` | Interface | Opções da chamada (`model`, `messages`, `temperature`, `max_tokens`, `top_p`) |
| `OpenRouterResponse` | Interface | Resposta bruta do OpenRouter |
| `getDefaultModels()` | Função | Retorna cópia dos modelos padrão |
| `getDefaultModel(feature)` | Função | Retorna o modelo padrão de um recurso específico |
| `getAIApiKey()` | Função async | Lê a API key da tabela `site_settings` (chave `ai_api_key`) |
| `callOpenRouter(options, apiKey?)` | Função async | Chamada HTTP direta ao OpenRouter. Se não receber apiKey, busca automaticamente do banco |
| `getAIModelFromDB(feature)` | Função async | Lê o modelo configurado para o recurso na tabela `site_settings` (chave `ai_models`). Faz fallback para o default |
| `aiChat(feature, messages, options?)` | Função async | Função de alto nível — resolve modelo e API key automaticamente, retorna o texto da resposta |

**Modelos padrão registrados:**

| Feature | Default |
|---------|---------|
| `content_generation` | `openai/gpt-4o-mini` |
| `title_suggestion` | `openai/gpt-4o-mini` |
| `excerpt_generation` | `openai/gpt-4o-mini` |
| `seo_optimization` | `openai/gpt-4o-mini` |
| `image_description` | `openai/gpt-4o-mini` |
| `summarization` | `openai/gpt-4o-mini` |

### 2. Armazenamento no banco

Os dados de IA são persistidos na tabela `site_settings` (key-value):

| Chave | Valor | Exemplo |
|-------|-------|---------|
| `ai_api_key` | String com a API key | `sk-or-v1-abc123...` |
| `ai_models` | JSON com modelo por feature | `{"content_generation":"openai/gpt-4o-mini","title_suggestion":"anthropic/claude-3.5-sonnet"}` |

Não foi necessária migration — a tabela já suportava dados arbitrários.

### 3. API de settings expandida

A rota `PUT /api/admin/settings` agora aceita um campo `ai` no body:

```json
{
  "ai": {
    "api_key": "sk-or-v1-...",
    "models": {
      "content_generation": "anthropic/claude-3.5-sonnet",
      "title_suggestion": "openai/gpt-4o-mini"
    }
  }
}
```

Comportamento:
- `api_key`: Faz upsert na chave `ai_api_key`
- `models`: Faz merge com os defaults (`getDefaultModels()`) e salva na chave `ai_models`. Recursos não enviados mantêm o modelo atual ou o default

O `GET /api/admin/settings` retorna o campo `ai` com a API key e todos os modelos (defaults mesclados com o que está no banco).

### 4. Seção de IA no painel de Configurações

Adicionada a seção **"IA (OpenRouter)"** na página `/admin/configuracoes` com:

- **Campo de API key** (input `type="password"`) com link para https://openrouter.ai/keys
- **Modelos por recurso**: Para cada feature registrada em `DEFAULT_MODELS`, exibe um input com label em português (via `FEATURE_LABELS`) e o ID do modelo editável

### 5. Documentação nos arquivos de orientação

Atualizados `AGENTS.md`, `CLAUDE.md` e `README.md` com a seção "AI / OpenRouter" documentando:
- Obrigatoriedade de usar OpenRouter (nunca SDKs diretos)
- Onde a API key é armazenada (banco, não env)
- Como adicionar novos recursos de IA
- Referência ao módulo `lib/ai.ts` como ponto único de integração

---

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `lib/ai.ts` | Módulo central de IA — tipos, funções de configuração e chamada ao OpenRouter |

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `app/api/admin/settings/route.ts` | Adicionado campo `ai` no schema Zod, upsert de `ai_api_key` e `ai_models`, retorno no GET |
| `app/admin/configuracoes/page.tsx` | Carrega API key e modelos do banco via `getAIApiKey()` e `getAIModelFromDB()`, passa como `initialAI` |
| `app/admin/configuracoes/ConfiguracoesClient.tsx` | Adicionada interface `AISettings`, estado `ai`, seção "IA (OpenRouter)" com campo de key e inputs de modelo por recurso |
| `.env.example` | Removido `OPENROUTER_API_KEY` — agora é apenas referência textual |
| `AGENTS.md` | Adicionada seção "AI / OpenRouter" com convenções e instruções para novos recursos |
| `CLAUDE.md` | Mesma atualização do AGENTS.md |
| `README.md` | Stack atualizada com OpenRouter |

---

## Como adicionar um novo recurso de IA

1. **No módulo** (`lib/ai.ts`): Adicionar a chave do recurso em `DEFAULT_MODELS` com um modelo padrão:
   ```ts
   const DEFAULT_MODELS: Record<string, string> = {
     // ...existentes
     novo_recurso: 'openai/gpt-4o-mini',
   }
   ```

2. **No painel admin** (`app/admin/configuracoes/ConfiguracoesClient.tsx`): Adicionar label em `FEATURE_LABELS`:
   ```ts
   const FEATURE_LABELS: Record<string, string> = {
     // ...existentes
     novo_recurso: 'Label do Novo Recurso',
   }
   ```

3. **No código do recurso**: Usar `aiChat()` para chamadas simples:
   ```ts
   import { aiChat } from '@/lib/ai'

   const resultado = await aiChat('novo_recurso', [
     { role: 'system', content: 'Você é um assistente...' },
     { role: 'user', content: 'Faça algo...' },
   ])
   ```

   Ou `getAIApiKey()` + `getAIModelFromDB()` + `callOpenRouter()` para controle fino.

4. **Nunca** chamar APIs de IA diretamente — sempre passar por `lib/ai.ts`.

---

## Fluxo de dados

```
Admin UI (/admin/configuracoes)
  → PUT /api/admin/settings { ai: { api_key, models } }
    → site_settings: ai_api_key = "sk-or-v1-..."
    → site_settings: ai_models = { "content_generation": "openai/gpt-4o-mini", ... }

Recurso de IA qualquer
  → aiChat(feature, messages)
    → getAIModelFromDB(feature)     // lê site_settings.ai_models
    → getAIApiKey()                 // lê site_settings.ai_api_key
    → callOpenRouter({ model, messages })
      → POST https://openrouter.ai/api/v1/chat/completions
    → retorna texto da resposta
```

---

## Prompt para replicar em outro projeto

O prompt abaixo pode ser usado para aplicar as mesmas funcionalidades em um projeto idêntico que ainda não possua este recurso. Basta colar o prompt na ferramenta de IA e ela criará tudo automaticamente.

---

```markdown
# Prompt: Criar infraestrutura de IA via OpenRouter com configuração no banco de dados

## Contexto

Tenho um projeto Next.js 14 App Router com TypeScript, Tailwind CSS, Drizzle ORM e PostgreSQL (Supabase). O projeto já possui:

- Tabela `site_settings` no banco com estrutura key-value (`key` text PK, `value` text, `updated_at` timestamp)
- Schema Drizzle em `drizzle/schema.ts` com a tabela `siteSettings` exportada
- Conexão com banco em `drizzle/db.ts` exportando `db`
- Rotas admin protegidas por JWT em `app/admin/`
- Página de configurações admin em `app/admin/configuracoes/` com server component (`page.tsx`) e client component (`ConfiguracoesClient.tsx`)
- API route existente em `app/api/admin/settings/route.ts` com GET e PUT que já salva template, colors e company na tabela `site_settings`
- Componente `Button` em `components/ui/Button` com variantes e prop `loading`
- Função `getSettings()` em `lib/settings.ts` que lê configurações do banco
- Variáveis de ambiente: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BLOG_NAME`

## Requisitos

- **TODO recurso de IA deve usar OpenRouter** (https://openrouter.ai). Nunca usar SDKs diretos de OpenAI, Anthropic, etc.
- A **API key do OpenRouter deve ser armazenada no banco de dados** (tabela `site_settings`, chave `ai_api_key`), configurável pelo painel admin. **NÃO usar variável de ambiente para a API key.**
- Cada recurso de IA tem seu próprio modelo LLM configurável, armazenado como JSON na chave `ai_models` da tabela `site_settings`.

## O que preciso que você faça

### Passo 1: Criar o módulo central de IA (`lib/ai.ts`)

Criar o arquivo `lib/ai.ts` com:

1. **Tipo `AIFeature`**: Union type com as chaves dos recursos de IA iniciais: `content_generation`, `title_suggestion`, `excerpt_generation`, `seo_optimization`, `image_description`, `summarization` e `string` (para extensibilidade).

2. **Constante `DEFAULT_MODELS`**: Record<string, string> mapeando cada feature para um modelo default (usar `"openai/gpt-4o-mini"` para todas).

3. **Funções exportadas**:
   - `getDefaultModels()` — retorna cópia de DEFAULT_MODELS
   - `getDefaultModel(feature)` — retorna o modelo default de uma feature (fallback: `"openai/gpt-4o-mini"`)
   - `getAIApiKey()` — async, lê a API key da tabela `site_settings` (chave `ai_api_key`). Retorna `string | null`. Usa dynamic import para `@/drizzle/db`, `@/drizzle/schema` e `drizzle-orm`.
   - `getAIModelFromDB(feature)` — async, lê o modelo da feature da tabela `site_settings` (chave `ai_models`, JSON). Faz merge com defaults. Usa dynamic import.
   - `callOpenRouter(options, apiKey?)` — async, faz POST para `https://openrouter.ai/api/v1/chat/completions`. Se não receber apiKey, chama `getAIApiKey()`. Headers: `Authorization: Bearer <key>`, `HTTP-Referer` com `NEXT_PUBLIC_APP_URL`, `X-Title` com `NEXT_PUBLIC_BLOG_NAME`. Body: model, messages, temperature (default 0.7), max_tokens (default 1024), top_p (opcional). Retorna tipagem `OpenRouterResponse`.
   - `aiChat(feature, messages, options?)` — async, função de alto nível. Chama `getAIModelFromDB(feature)` para resolver o modelo, depois `callOpenRouter()`. Retorna o texto da resposta (`choices[0].message.content`).

4. **Interfaces exportadas**:
   - `OpenRouterMessage` — `{ role: 'system' | 'user' | 'assistant'; content: string }`
   - `OpenRouterOptions` — `{ model: string; messages: OpenRouterMessage[]; temperature?: number; max_tokens?: number; top_p?: number }`
   - `OpenRouterResponse` — Tipagem da resposta do OpenRouter (com `id`, `choices`, `usage`)

### Passo 2: Atualizar a API de settings

No arquivo `app/api/admin/settings/route.ts`:

1. Importar `getDefaultModels` de `@/lib/ai`

2. Adicionar no schema Zod (`putSchema`) um campo opcional `ai`:
   ```ts
   ai: z.object({
     api_key: z.string().max(200).optional(),
     models: z.record(z.string(), z.string()).optional(),
   }).optional(),
   ```

3. No handler PUT, após o bloco de `company`, adicionar:
   - Se `ai.api_key` estiver presente, fazer upsert na chave `ai_api_key` da tabela `site_settings`
   - Se `ai.models` estiver presente, fazer merge com `getDefaultModels()` e salvar como JSON na chave `ai_models`

4. No handler GET, após carregar settings, também ler as chaves `ai_api_key` e `ai_models` do banco. Retornar no JSON como `{ ...settings, ai: { api_key: string, models: Record<string, string> } }`. Para `models`, fazer merge dos defaults com o que está salvo.

### Passo 3: Atualizar a página de configurações

**Server component** (`app/admin/configuracoes/page.tsx`):
- Importar `getDefaultModels`, `getAIApiKey`, `getAIModelFromDB` de `@/lib/ai`
- Chamar `getAIApiKey()` para obter a key (ou string vazia)
- Para cada feature em `getDefaultModels()`, chamar `getAIModelFromDB(feature)` para resolver o modelo
- Passar tudo como prop `initialAI={{ api_key, models }}` para o client component

**Client component** (`app/admin/configuracoes/ConfiguracoesClient.tsx`):
- Adicionar interface `AISettings { api_key: string; models: Record<string, string> }`
- Adicionar `initialAI: AISettings` nas Props
- Adicionar constante `FEATURE_LABELS` mapeando feature keys para labels em português:
  - `content_generation` → "Geração de Conteúdo"
  - `title_suggestion` → "Sugestão de Títulos"
  - `excerpt_generation` → "Geração de Resumo"
  - `seo_optimization` → "Otimização SEO"
  - `image_description` → "Descrição de Imagens"
  - `summarization` → "Sumarização"
- Adicionar estado `ai` inicializado com `initialAI`
- Adicionar handlers `handleAIKeyChange` e `handleAIModelChange`
- Incluir `ai` no body do PUT ao salvar
- Adicionar seção de UI "IA (OpenRouter)" com:
  - Texto explicativo com link para https://openrouter.ai/keys
  - Input `type="password"` para a API key
  - Separador visual
  - Para cada feature em `ai.models`, exibir label + input com o ID do modelo editável
  - Os inputs devem ter placeholder `"openai/gpt-4o-mini"`

### Passo 4: Atualizar `.env.example`

Remover qualquer referência a `OPENROUTER_API_KEY` como variável ativa. Adicionar apenas um comentário informativo:

```
# ─── IA (OPENROUTER) ─────────────────────────────────────────────────────
# A chave de API do OpenRouter é configurada via painel admin (Configurações → IA).
# Obtenha sua chave em: https://openrouter.ai/keys
```

### Passo 5: Atualizar documentação dos arquivos .md

Em `AGENTS.md` e `CLAUDE.md` (ou equivalente), adicionar seção `### AI / OpenRouter` na parte de Architecture com:

- Aviso de que TODA IA deve usar OpenRouter
- Referência ao módulo `lib/ai.ts` e suas funções exportadas
- Explicação de que a API key fica no banco (`site_settings`, chave `ai_api_key`)
- Explicação de que modelos por recurso ficam no banco (`site_settings`, chave `ai_models`)
- Instruções de como adicionar um novo recurso (adicionar em DEFAULT_MODELS, adicionar label em FEATURE_LABELS, usar aiChat)
- Aviso de nunca chamar APIs de IA diretamente

Na seção `Environment Variables`, **remover** `OPENROUTER_API_KEY`.

Em `README.md`, adicionar OpenRouter na stack com nota de que a configuração é via painel admin.

### Passo 6: Verificação

Após todas as alterações, rodar `npx tsc --noEmit` para garantir que não há erros de tipo.

## Convenções

- Não adicionar comentários no código
- Seguir o estilo de código existente no projeto
- Usar português para labels e mensagens de texto visíveis ao usuário
- Usar inglês para nomes de variáveis, tipos e chaves de API/banco
- Nunca usar variáveis de ambiente para a API key do OpenRouter — sempre banco de dados
- Nunca chamar APIs de provedores de IA diretamente — sempre usar `lib/ai.ts`
```