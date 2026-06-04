# Telegram Bot — Geração de Artigos via Mensagem

## Visão Geral

Integração de um bot do Telegram que permite gerar e publicar artigos com IA enviando apenas uma mensagem. O usuário manda um tema (texto) ou um link para o bot e o sistema executa o pipeline completo: geração do conteúdo com IA, sanitização do HTML, publicação imediata no blog e resposta automática com o título e o link do artigo publicado.

Toda a configuração é feita dentro do painel admin em **Configurações → Telegram Bot**, com um guia passo a passo embutido na própria tela.

---

## Funcionalidades

### Dois modos de geração

- **A partir de tema** — O usuário envia um texto livre (ex: _"Impacto do BJJ no MMA moderno"_). O sistema gera um artigo original usando o briefing da empresa como contexto.
- **A partir de link** — O usuário envia uma URL (ex: `https://exemplo.com/noticia`). O sistema faz scraping do conteúdo, passa para a IA e gera um artigo novo e original baseado naquele conteúdo (sem copiar).

### Segurança

- **Validação por secret token** — Quando o webhook é registrado, um `secret_token` (SHA-256 do bot token) é enviado ao Telegram. A cada mensagem recebida, o header `X-Telegram-Bot-Api-Secret-Token` é verificado antes de qualquer processamento.
- **Whitelist de Chat IDs** — Somente os chat IDs configurados no painel podem disparar geração. Mensagens de outros chats são silenciosamente ignoradas.

### Comando `/start`

Quando o usuário envia `/start` para o bot, o bot responde com o Chat ID daquele chat — facilita o preenchimento do campo de Chat IDs autorizados sem precisar usar serviços externos.

### Configuração no painel admin

A seção **Telegram Bot** em Configurações contém:
- Campo de token do bot (campo password)
- Campo de Chat IDs autorizados (separados por vírgula)
- Guia passo a passo detalhado embutido na própria tela
- Botão **Registrar Webhook** — salva as configurações no banco e registra o webhook no Telegram em uma única ação

---

## Arquivos Criados / Modificados

### Novos

| Arquivo | Função |
|---|---|
| `lib/telegram.ts` | Pipeline completo: `getTelegramConfig()`, `computeWebhookSecret()`, `sendTelegramMessage()`, `generateAndPublishPost()` |
| `app/api/telegram/webhook/route.ts` | Endpoint público que recebe os updates do Telegram, valida o secret, verifica whitelist e executa o pipeline |
| `app/api/admin/telegram/setup/route.ts` | Endpoint admin que chama `setWebhook` na API do Telegram para registrar a URL do webhook |

### Modificados

| Arquivo | Alteração |
|---|---|
| `app/api/admin/settings/route.ts` | Adicionado campo `telegram` ao schema Zod e handler que persiste `telegram_config` em `site_settings` |
| `app/admin/configuracoes/ConfiguracoesClient.tsx` | Nova seção `'telegram'` no sidebar e no `renderContent()`, novos estados e handlers, guia passo a passo, botão Registrar Webhook com auto-save |
| `app/admin/configuracoes/page.tsx` | Carrega `getTelegramConfig()` no servidor e passa como prop `initialTelegram` |

---

## Fluxo Técnico

```
Usuário envia mensagem no Telegram
        │
        ▼
POST /api/telegram/webhook
        │
        ├─ Valida X-Telegram-Bot-Api-Secret-Token (SHA-256 do bot token)
        ├─ Ignora chats não autorizados
        ├─ /start → responde com o Chat ID
        │
        ▼
sendTelegramMessage("⏳ Gerando artigo, aguarde...")
        │
        ▼
generateAndPublishPost(text)
        │
        ├─ isUrl(text)?
        │      ├─ SIM → fetchUrlContent(url) → prompt de reescrita
        │      └─ NÃO → carrega briefing do DB → prompt de tema
        │
        ├─ aiChat('content_generation', prompt, { max_tokens: 6000 })
        ├─ JSON.parse(resultado)
        ├─ sanitizeHtml(content)
        └─ INSERT posts (status: 'published', published_at: now)
        │
        ▼
sendTelegramMessage("✅ Artigo publicado!\n<b>Título</b>\n🔗 link")
        │
        ▼
return NextResponse.json({ ok: true })
```

---

## Armazenamento

Não foi criada nenhuma tabela nova. A configuração é armazenada na tabela `site_settings` já existente:

| key | value |
|---|---|
| `telegram_config` | `{"bot_token":"...","allowed_chat_ids":"123456,789012"}` |

---

## Variáveis de Ambiente Necessárias

Nenhuma nova variável foi adicionada. O bot token e os chat IDs são persistidos no banco via painel admin. A única variável de ambiente usada é `NEXT_PUBLIC_APP_URL`, já existente, que é usada para compor a URL do webhook na hora do registro.

---

## Limitações Conhecidas

- **Sem geração de imagem de capa** — Para manter o tempo de resposta dentro do limite de 60s do Vercel (`maxDuration = 60`), o pipeline Telegram não inclui geração de imagem de capa. A imagem pode ser adicionada manualmente pelo admin após a publicação.
- **Ambiente local** — O webhook do Telegram exige uma URL HTTPS pública. Em desenvolvimento local (`localhost`), o registro do webhook vai falhar. Use um tunnel (ngrok, cloudflare tunnel) ou teste diretamente em produção.
- **Timeout** — Artigos muito longos ou modelos de IA lentos podem ultrapassar 60s. Se isso ocorrer, o artigo pode ter sido criado mas a resposta do Telegram não enviada. O post estará publicado no blog normalmente.

---

## Como Configurar (Resumo)

1. No Telegram, fale com **@BotFather** → `/newbot` → copie o token
2. No painel admin: **Configurações → Telegram Bot** → cole o token → clique **Registrar Webhook**
3. Abra uma conversa com seu bot → envie `/start` → copie o Chat ID retornado
4. Cole o Chat ID no campo **Chat IDs autorizados** → o botão Registrar Webhook salva e registra automaticamente
5. Pronto — envie um tema ou URL para o bot e aguarde o artigo ser publicado

---

## Prompt para Replicar em Outro Projeto

Use o prompt abaixo para implementar a mesma funcionalidade em qualquer projeto Next.js com banco de dados e geração de conteúdo com IA:

---

```
Quero integrar um bot do Telegram no meu projeto Next.js (App Router) para geração automática de conteúdo com IA. O fluxo deve funcionar assim: o usuário envia uma mensagem para o bot com um tema (texto livre) ou uma URL, o sistema gera um artigo completo com IA e o publica, e o bot responde com o título e o link do artigo.

Contexto do projeto:
- Next.js 14 App Router + TypeScript
- Banco de dados via Drizzle ORM (PostgreSQL). Existe uma tabela `site_settings` com colunas `key` (PK) e `value` (text) usada como key-value store para configurações
- Geração de conteúdo via [DESCREVA SUA FUNÇÃO DE IA — ex: "função aiChat(feature, messages, options) que chama OpenRouter"]
- Os posts são inseridos na tabela `posts` com os campos: title, slug, content, excerpt, status ('draft' | 'published'), published_at, updated_at
- Já existe uma função generateSlug(title) em lib/slug.ts
- Já existe sanitize-html configurado para limpar o HTML gerado pela IA
- A URL base do app está em process.env.NEXT_PUBLIC_APP_URL
- O projeto está deployado no Vercel

O que precisa ser implementado:

1. **lib/telegram.ts** — módulo com:
   - Interface TelegramConfig { bot_token: string; allowed_chat_ids: string }
   - getTelegramConfig(): lê telegram_config de site_settings e faz JSON.parse
   - computeWebhookSecret(botToken): retorna SHA-256 do token (para validar requests do Telegram)
   - sendTelegramMessage(botToken, chatId, text): POST para api.telegram.org/bot.../sendMessage com parse_mode HTML
   - isUrl(text): detecta se o texto é uma URL válida (http/https)
   - fetchUrlContent(url): faz fetch da URL, remove scripts/styles/nav/footer/header com regex, extrai blocos de texto de tags p/h1-6/li/blockquote, retorna até 15000 chars
   - generateAndPublishPost(input): decide entre modo URL e modo tema, monta o prompt adequado para a IA (incluindo briefing da empresa se existir em site_settings sob a chave 'briefing_content'), chama a função de IA, faz parse do JSON retornado, insere o post com status 'published' e retorna { post_id, title, slug }

2. **app/api/telegram/webhook/route.ts** — rota pública POST com maxDuration = 60:
   - Lê config do DB; se não tiver bot_token configurado, retorna { ok: true } silenciosamente
   - Valida header X-Telegram-Bot-Api-Secret-Token contra computeWebhookSecret(bot_token)
   - Faz parse do body como TelegramUpdate { update_id, message?: { chat: { id }, text? } }
   - Se texto for /start, responde com o Chat ID (para facilitar configuração)
   - Ignora outros comandos (/ prefix)
   - Valida se o chat.id está na whitelist de allowed_chat_ids (split por vírgula)
   - Envia "⏳ Gerando artigo, aguarde..." via sendTelegramMessage
   - Chama generateAndPublishPost(text), monta a URL do post com NEXT_PUBLIC_APP_URL + slug
   - Envia "✅ Artigo publicado!\n\n<b>Título</b>\n\n🔗 url" via sendTelegramMessage
   - Em caso de erro, envia "❌ Erro: mensagem" via sendTelegramMessage
   - Sempre retorna NextResponse.json({ ok: true }) com status 200

3. **app/api/admin/telegram/setup/route.ts** — rota admin POST:
   - Lê config do DB; se não tiver bot_token, retorna 400 com mensagem clara
   - Verifica se NEXT_PUBLIC_APP_URL está definido
   - Chama https://api.telegram.org/bot{token}/setWebhook com { url: appUrl + '/api/telegram/webhook', secret_token: computeWebhookSecret(token), allowed_updates: ['message'] }
   - Retorna { success: true, webhook_url } ou { error: 'Telegram: ...' } com status 400

4. **Atualização da API de settings** — adicionar suporte a telegram no endpoint PUT existente:
   - Schema Zod: telegram: z.object({ bot_token: z.string().optional(), allowed_chat_ids: z.string().max(500).optional() }).optional()
   - Handler: faz merge com configuração existente e salva como JSON em site_settings sob a chave 'telegram_config'

5. **UI nas configurações do admin** — nova seção "Telegram Bot":
   - Sidebar item com ícone
   - Guia passo a passo detalhado explicando: como criar bot no @BotFather, obter o token, registrar o webhook, descobrir o Chat ID enviando /start para o bot
   - Campo password para o bot token
   - Campo text para allowed_chat_ids com nota explicativa
   - Botão "Registrar Webhook" que: (a) salva o telegram config no banco via PUT settings, (b) chama POST /api/admin/telegram/setup, (c) exibe toast com resultado
   - Estado webhookLoading para feedback visual no botão

Detalhes importantes:
- O webhook não precisa de autenticação por middleware (é chamado pelo Telegram, não pelo admin). A segurança é feita pelo secret_token no header
- Não gere imagem de capa no pipeline do Telegram para manter o tempo dentro do limite de 60s
- Adicione timestamp ao slug (slug + '-' + Date.now()) para evitar conflito de unique constraint em publicações rápidas
- O comando /start deve responder com o Chat ID usando <code>id</code> em HTML do Telegram
- Escape HTML no título ao enviar para o Telegram (substituir &, <, > pelos equivalentes HTML)
- O botão Registrar Webhook deve salvar as configurações antes de chamar o setup, para garantir que o DB está atualizado antes do endpoint de setup ler o token
```
