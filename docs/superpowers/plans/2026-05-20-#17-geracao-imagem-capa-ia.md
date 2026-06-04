# #15 - Geração de Imagem de Capa com IA via OpenRouter

## Visão Geral

Implementação de um botão "Gerar Imagem com IA" na área de upload de imagem de capa dos artigos (edição e criação). O sistema usa o prompt de imagem configurado na seção "Prompts de IA", injeta o contexto do artigo (título, resumo e conteúdo) e gera uma imagem de capa relevante via OpenRouter. A imagem gerada é salva no Supabase Storage e definida automaticamente como capa do artigo.

---

## Fluxo

1. O usuário preenche ao menos o título do artigo
2. Clica em "Gerar Imagem com IA" no componente de upload
3. O frontend envia `{ title, excerpt, content }` para `POST /api/admin/ai/image/generate`
4. A API busca o **prompt template de imagem** salvo em `site_settings` (chave `prompts` → campo `image`)
5. Usa um LLM (feature `image_description`) para expandir o template com o contexto do artigo, gerando um prompt otimizado em inglês
6. Chama o **modelo de geração de imagem** (feature `image_generation`) via OpenRouter `POST /chat/completions` com `modalities: ["text", "image"]`
7. A resposta contém a imagem em `choices[].message.images[].image_url.url` (pode ser URL ou base64 data URI)
8. A imagem é baixada e salva no Supabase Storage
9. A URL pública é retornada e definida como `cover_image` do artigo

---

## Arquivos Modificados/Criados

### `lib/ai.ts`

- Adicionado `image_generation` ao `DEFAULT_MODELS` com default `'openai/gpt-5-image'`
- Adicionada constante `IMAGE_MODELS` com modelos de imagem estáticos (OpenRouter não lista esses modelos no endpoint `/api/v1/models`): `openai/gpt-5-image`, `openai/gpt-5-image-mini`, `openai/gpt-5.4-image-2`, `google/gemini-2.5-flash-image`, `google/gemini-3.1-flash-image-preview`, `google/gemini-3-pro-image-preview`
- Modificada `fetchAvailableModels()` para mesclar modelos de chat (da API) com modelos de imagem (lista estática)
- Adicionada `callOpenRouterImage(prompt, model?, apiKey?)` — usa `/api/v1/chat/completions` com `modalities: ["text", "image"]` e `max_tokens: 4096`
- Adicionada `getPromptFromDB(key)` — lê a chave `prompts` do `site_settings` e retorna o prompt de um tipo específico

### `app/api/admin/ai/image/generate/route.ts` (novo)

API route autenticada que orquestra toda a geração:
- Recebe `{ title, excerpt, content }`
- Busca prompt de imagem do DB via `getPromptFromDB('image')`
- Gera prompt otimizado via `aiChat('image_description', ...)`
- Gera imagem via `callOpenRouterImage(prompt)`
- Trata resposta como URL ou base64 data URI
- Faz upload para Supabase Storage
- Retorna `{ url: publicUrl }`

### `components/ui/ImageUpload.tsx`

- Adicionada prop opcional `aiContext?: { title: string; excerpt?: string; content?: string }`
- Quando `aiContext` está presente, exibe botão "Gerar Imagem com IA" abaixo do upload
- O botão fica desabilitado se o título não estiver preenchido
- Mostra spinner durante a geração

### `app/admin/artigos/[id]/editar/page.tsx`

- Passa `aiContext={{ title, excerpt, content }}` para o `<ImageUpload>`

### `app/admin/artigos/novo/page.tsx`

- Passa `aiContext={{ title, excerpt, content }}` para o `<ImageUpload>`

### `app/admin/configuracoes/ConfiguracoesClient.tsx`

- Adicionado `image_generation: 'Geração de Imagens'` ao `FEATURE_LABELS`

### `app/api/admin/settings/route.ts`

- Corrigido bug: o schema Zod do PUT não incluía o campo `ai`, então as configurações de modelo e API key eram descartadas silenciosamente
- Adicionado campo `ai` ao schema: `{ api_key?: string, models?: Record<string, string> }`
- Adicionada lógica para salvar `ai_api_key` e `ai_models` no `site_settings`

---

## Como o OpenRouter Gera Imagens

O OpenRouter **não possui** um endpoint dedicado `/api/v1/images/generations`. A geração de imagem é feita via `POST /api/v1/chat/completions` com:

```json
{
  "model": "openai/gpt-5-image",
  "modalities": ["text", "image"],
  "max_tokens": 4096,
  "messages": [
    { "role": "user", "content": "A professional blog cover image of..." }
  ]
}
```

Resposta:
```json
{
  "choices": [{
    "message": {
      "images": [
        { "image_url": { "url": "data:image/png;base64,..." } }
      ]
    }
  }]
}
```

A URL pode ser um link externo ou um data URI base64.

---

## Modelos de Imagem Disponíveis

| Modelo | Provider |
|--------|----------|
| `openai/gpt-5-image` | OpenAI (default) |
| `openai/gpt-5-image-mini` | OpenAI |
| `openai/gpt-5.4-image-2` | OpenAI |
| `google/gemini-2.5-flash-image` | Google |
| `google/gemini-3.1-flash-image-preview` | Google |
| `google/gemini-3-pro-image-preview` | Google |

---

## Prompt de Implementação para Outros Projetos

Use o prompt abaixo para implementar essa mesma funcionalidade em outro projeto que use OpenRouter:

```
## Tarefa: Implementar geração de imagem de capa com IA via OpenRouter

### Contexto
O sistema é um blog/painel admin onde o usuário cria artigos. Na tela de edição/criação do artigo, há um campo de upload de imagem de capa. Preciso adicionar um botão "Gerar Imagem com IA" nesse campo que gere uma imagem contextualizada com o artigo.

### Requisitos

1. **Componente de Upload de Imagem** — Adicionar um botão "Gerar Imagem com IA" abaixo do upload. O botão deve:
   - Ficar desabilitado se o título do artigo não estiver preenchido
   - Enviar o contexto do artigo (título, resumo, conteúdo) para o backend
   - Mostrar loading spinner durante a geração
   - Receber a URL da imagem gerada e atualizar o campo de capa

2. **API Route de Geração de Imagem** — Criar endpoint autenticado `POST /api/admin/ai/image/generate` que:
   - Receba `{ title: string, excerpt?: string, content?: string }`
   - Busque o prompt template de imagem do banco (se existir)
   - Use um LLM para expandir o prompt template com o contexto do artigo, gerando um prompt em inglês otimizado
   - Chame o OpenRouter para gerar a imagem
   - Salve a imagem no storage (Supabase Storage, S3, ou local)
   - Retorne `{ url: string }` com a URL pública

3. **Integração com OpenRouter** — A geração de imagem no OpenRouter é feita via `POST https://openrouter.ai/api/v1/chat/completions` com o body:
   ```json
   {
     "model": "MODELO_DE_IMAGEM",
     "modalities": ["text", "image"],
     "max_tokens": 4096,
     "messages": [{ "role": "user", "content": "prompt de geração" }]
   }
   ```
   A resposta vem em `choices[0].message.images[0].image_url.url` (pode ser URL ou base64 data URI).

   Modelos de imagem disponíveis no OpenRouter (não listados no endpoint `/api/v1/models`):
   - `openai/gpt-5-image` (recomendado como default)
   - `openai/gpt-5-image-mini`
   - `google/gemini-2.5-flash-image`
   - `google/gemini-3.1-flash-image-preview`

4. **Configuração de Modelo** — Adicionar "Geração de Imagens" na tela de configurações de IA do painel admin, permitindo que o usuário escolha qual modelo de imagem usar. O modelo selecionado deve ser salvo no banco e respeitado na hora de gerar.

5. **Prompt Template** — O sistema já tem uma seção "Prompts de IA" com um campo "Prompt para Imagens". Use esse prompt como template, injetando o contexto do artigo (título, resumo, conteúdo limpo de HTML). Se o prompt template não existir, use um fallback que peça ao LLM para gerar um prompt de imagem de capa profissional.

6. **Configuração de IA** — Garantir que o endpoint de salvar configurações (`PUT /api/admin/settings`) inclua no schema de validação o campo `ai` com `api_key` e `models`. Sem isso, as configurações de IA são silenciosamente descartadas ao salvar.

### Detalhes Técnicos
- O endpoint `/api/v1/images/generations` NÃO existe no OpenRouter. Use sempre `/api/v1/chat/completions` com `modalities: ["text", "image"]`
- A resposta pode conter a imagem como URL externa ou como `data:image/png;base64,...`. Trate ambos os casos
- Modelos de imagem não aparecem no endpoint `/api/v1/models` do OpenRouter. Adicione uma lista estática e mescle com os modelos retornados pela API
- Use `max_tokens: 4096` para a geração de imagem — menos que isso pode causar `finish_reason: "length"` e a imagem não ser gerada
```
