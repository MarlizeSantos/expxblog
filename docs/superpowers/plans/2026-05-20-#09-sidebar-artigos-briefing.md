# Sidebar de Artigos e Briefing Automático

## Visão Geral

Implementação de um sidebar interno na área de Artigos do painel administrativo, seguindo o mesmo padrão visual do sidebar de Configurações. O sidebar contém 5 seções, com destaque para a funcionalidade de **Briefing Automático** — que faz crawl do site da empresa, envia o conteúdo para uma LLM via OpenRouter e gera um briefing estratégico completo para produção de conteúdo.

---

## Estrutura do Sidebar

| Seção | Ícone | Status | Descrição |
|---|---|---|---|
| Lista de Artigos | 📝 | Funcional | Tabela de posts com filtros, criar/editar/excluir |
| Temas | 💡 | Placeholder | Gerenciamento de temas de artigos |
| Briefing | 📋 | Funcional | Geração automática de briefing via IA |
| Automação | 🤖 | Placeholder | Automação de postagens |
| Prompts de IA | ✨ | Placeholder | Configuração de prompts |

---

## Arquivos Criados / Modificados

### Novos Arquivos

| Arquivo | Descrição |
|---|---|
| `app/admin/artigos/ArtigosClient.tsx` | Componente client com sidebar + todas as seções |
| `app/api/admin/briefing/route.ts` | API REST para briefing (GET/POST/PUT) |

### Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `app/admin/artigos/page.tsx` | Simplificado para renderizar `ArtigosClient` |
| `lib/ai.ts` | Adicionado `briefing_generation` ao `DEFAULT_MODELS` |
| `app/admin/configuracoes/ConfiguracoesClient.tsx` | Adicionado label "Geração de Briefing" ao `FEATURE_LABELS` |

---

## Arquitetura do Sidebar

O sidebar segue o padrão **state-based** (não URL-based), idêntico ao `ConfiguracoesClient.tsx`:

```tsx
type SectionId = 'lista' | 'temas' | 'briefing' | 'automacao' | 'prompts'

const SIDEBAR_ITEMS = [
  { id: 'lista',     label: 'Lista de Artigos', icon: '📝' },
  { id: 'temas',     label: 'Temas',            icon: '💡' },
  { id: 'briefing',  label: 'Briefing',         icon: '📋' },
  { id: 'automacao', label: 'Automação',        icon: '🤖' },
  { id: 'prompts',   label: 'Prompts de IA',    icon: '✨' },
]
```

- Navegação via `useState<SectionId>` com `activeSection`
- Seção ativa recebe `bg-brand-primary text-white`
- Seções inativas recebem `text-gray-700 hover:bg-gray-50`
- Layout flex com sidebar `w-56` fixa + conteúdo `flex-1`

---

## Briefing Automático — Detalhes Técnicos

### Fluxo Completo

```
Usuário informa URL
       ↓
Frontend: POST /api/admin/briefing { url }
       ↓
API: crawlWebsite(url)
  ├── fetchPage(url) → HTML da página principal (até 5.000 chars)
  ├── extractInternalLinks() → links do mesmo domínio
  ├── Para cada link (até 12):
  │     └── fetchPage(link) → HTML da sub-página (até 3.000 chars)
  └── Retorna texto combinado (até 30.000 chars)
       ↓
API: aiChat('briefing_generation', [system, user])
  ├── Resolve API key do site_settings (ai_api_key)
  ├── Resolve modelo do site_settings (ai_models.briefing_generation)
  └── POST https://openrouter.ai/api/v1/chat/completions
       ↓
API: Salva briefing + url no site_settings
       ↓
Frontend: Exibe briefing no textarea editável
```

### API Route — `app/api/admin/briefing/route.ts`

#### `GET /api/admin/briefing`
Retorna o briefing salvo.
```json
{ "url": "https://empresa.com.br", "briefing": "..." }
```

#### `POST /api/admin/briefing`
Gera briefing a partir da URL. Faz crawl do site e envia para a LLM.
```json
// Request
{ "url": "https://empresa.com.br" }

// Response
{ "briefing": "## Sobre a Empresa\n..." }
```

#### `PUT /api/admin/briefing`
Salva edições manuais do briefing.
```json
{ "url": "https://empresa.com.br", "briefing": "texto editado..." }
```

### Web Crawler

O crawler é implementado com `fetch()` nativo (sem dependências externas):

1. **`fetchPage(url)`** — Busca HTML com timeout de 10s e User-Agent customizado
2. **`htmlToText(html)`** — Remove scripts, styles, nav, footer, SVG, comments, depois stripa tags HTML e decodifica entidades
3. **`extractInternalLinks(html, domain)`** — Extrai links absolutos e relativos do mesmo domínio
4. **`crawlWebsite(baseUrl)`** — Orquestra tudo: busca principal + até 12 sub-páginas, limita a 30.000 chars

Filtros aplicados:
- Ignora extensões de arquivo (imagens, CSS, JS, fontes, vídeos, PDFs)
- Ignora páginas com menos de 100 chars de texto
- Timeout de 10s por página
- Máximo de 12 sub-páginas

### Prompt do Sistema (System Prompt)

```
Você é um estrategista de conteúdo digital especializado em criar briefings para blogs corporativos.

Com base no conteúdo do site da empresa fornecido, você deve gerar um briefing completo e detalhado contendo:

1. **Sobre a Empresa** — Resumo do que a empresa faz, seus produtos/serviços, mercado de atuação e posicionamento.
2. **Público-Alvo** — Perfil detalhado do público-alvo (demografia, interesses, dores, necessidades).
3. **Objetivos de Conteúdo** — Quais objetivos estratégicos o blog deve atender (autoridade, geração de leads, educação, engajamento).
4. **Pilares de Conteúdo** — Sugestão de 4 a 6 pilares temáticos relevantes para o nicho da empresa.
5. **Tom e Estilo** — Recomendações de tom de voz, estilo de escrita e formato preferencial dos artigos.
6. **Sugestões de Artigos** — Liste 15 a 20 ideias de títulos de artigos relevantes que poderiam ser produzidos, organizados por pilar de conteúdo.
7. **Palavras-chave** — Sugira palavras-chave e temas relevantes para SEO dentro do nicho.

Responda em português brasileiro. Seja detalhado e estratégico.
```

O prompt é enviado com `max_tokens: 4096` para permitir respostas longas e detalhadas.

### Armazenamento

Os dados do briefing são persistidos na tabela `site_settings` existente:

| Chave | Conteúdo |
|---|---|
| `briefing_url` | URL do site da empresa |
| `briefing_content` | Texto completo do briefing |

Não foi necessário criar novas tabelas ou migrações.

### Feature de IA

Registrada como `briefing_generation` no sistema de IA:

- **`lib/ai.ts`**: Adicionado ao `DEFAULT_MODELS` com modelo padrão `openai/gpt-4o-mini`
- **Configurações → IA**: Aparece como "Geração de Briefing" para seleção de modelo por feature
- Usa a função `aiChat('briefing_generation', messages, { max_tokens: 4096 })` que resolve automaticamente a API key e o modelo configurado

---

## Frontend — BriefingSection

### Campos

| Campo | Tipo | Descrição |
|---|---|---|
| Site da Empresa | `input[url]` | URL do site para crawl |
| Gerar Briefing | `button` | Dispara POST com loading spinner |
| Conteúdo do Briefing | `textarea[20 rows]` | Texto gerado/editável com `resize-y` |
| Salvar Briefing | `button` | Dispara PUT para persistir |

### Comportamento

- Ao abrir a seção, carrega automaticamente o briefing salvo via `GET`
- O botão "Gerar Briefing" fica desabilitado enquanto a URL está vazia ou durante o loading
- O textarea é livremente editável — o usuário pode escrever, colar ou modificar o texto gerado
- Toast de sucesso/erro aparece após gerar ou salvar
- O briefing é salvo automaticamente após geração e pode ser re-salvo manualmente a qualquer momento

---

## Como Adicionar uma Nova Seção ao Sidebar

1. Adicionar o ID ao union type `SectionId` em `ArtigosClient.tsx`
2. Adicionar o item ao array `SIDEBAR_ITEMS`
3. Adicionar um `case` no `switch` do `renderContent()`
4. Implementar o componente da seção (pode ser inline ou um componente separado como `BriefingSection`)

---

## Como Adicionar uma Nova Feature de IA

1. Adicionar a feature ao `DEFAULT_MODELS` em `lib/ai.ts`
2. Adicionar o label em `FEATURE_LABELS` em `app/admin/configuracoes/ConfiguracoesClient.tsx`
3. Usar `aiChat(feature, messages, options?)` na API route — resolve automaticamente key e modelo

---

## Dependências

Nenhuma dependência nova foi adicionada. A implementação usa apenas:

- `fetch()` nativo para HTTP requests
- `drizzle-orm` para banco de dados
- `lib/ai.ts` para chamadas ao OpenRouter
- Componentes UI existentes (`Badge`, `Button`)
