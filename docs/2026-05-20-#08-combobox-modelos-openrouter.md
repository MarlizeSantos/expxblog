# Combobox de Modelos OpenRouter com Busca

**Data:** 2026-05-20

## Resumo

Substituição dos inputs de texto livre para seleção de modelos LLM por um componente de combobox com busca. Os modelos são buscados diretamente da API pública do OpenRouter (`https://openrouter.ai/api/v1/models`), permitindo ao administrador pesquisar e selecionar visualmente o modelo desejado para cada recurso de IA.

---

## Decisoes de design

### Por que buscar da API do OpenRouter?

- A lista de modelos muda frequentemente (novos modelos, descontinuados, renomeados)
- Garante que o admin sempre veja modelos válidos e atuais
- Elimina a necessidade de manter uma lista hardcoded que ficaria desatualizada

### Por que um combobox customizado em vez de um `<select>`?

- `<select>` nativo não suporta busca/filter
- Libs de UI (headlessui, radix) adicionariam dependências que o projeto não usa
- O componente é simples o suficiente para manter zero dependência extra

### Por que uma API route interna em vez de chamar o OpenRouter direto do client?

- Evita expor chamadas cross-origin do browser
- Permite cache no servidor (`next: { revalidate: 3600 }`)
- Centraliza o tratamento de erros

---

## O que foi implementado

### 1. Função `fetchAvailableModels()` no modulo de IA

Adicionada em `lib/ai.ts`:

- Busca `GET https://openrouter.ai/api/v1/models` com revalidação de 1 hora (`next: { revalidate: 3600 }`)
- Filtra modelos que possuam `id` e `name`
- Ordena alfabeticamente por `name`
- Retorna `OpenRouterModel[]` com `id`, `name`, `context_length` e `pricing`

### 2. API route interna `GET /api/admin/ai/models`

Criada em `app/api/admin/ai/models/route.ts`:

- Chama `fetchAvailableModels()` do `lib/ai.ts`
- Retorna JSON array com `{ id, name, context_length, pricing }`
- Usa `dynamic = 'force-dynamic'` do Next.js

### 3. Componente `ModelCombobox`

Criado em `components/ui/ModelCombobox.tsx`:

Componente de combobox com as seguintes funcionalidades:

| Funcionalidade | Detalhe |
|---|---|
| **Busca em tempo real** | Filtra modelos por `id` ou `name` conforme digita |
| **Navegação por teclado** | Arrow Up/Down, Enter para selecionar, Escape para fechar |
| **Highlight visual** | Modelo selecionado aparece em destaque (cor primaria da marca) |
| **Scroll automatico** | Item com highlight rola para visibilidade automaticamente |
| **Click outside** | Fecha o dropdown ao clicar fora |
| **Auto-focus** | Campo de busca recebe foco automaticamente ao abrir |
| **Estado vazio** | Exibe "Nenhum modelo encontrado" quando a busca nao retorna resultados |
| **Estado loading** | Exibe "Carregando modelos..." enquanto busca |
| **Layout de cada item** | Nome do modelo (bold) + ID do modelo (cinza menor) |

**Props do componente:**

| Prop | Tipo | Descricao |
|---|---|---|
| `value` | `string` | ID do modelo selecionado atualmente |
| `onChange` | `(value: string) => void` | Callback quando um modelo e selecionado |
| `models` | `{ id: string; name: string }[]` | Lista de modelos disponíveis |
| `loading` | `boolean` | Se os modelos ainda estão carregando |

### 4. Integracao no painel de Configuracoes

Atualizado `app/admin/configuracoes/ConfiguracoesClient.tsx`:

- No mount, faz `fetch('/api/admin/ai/models')` para carregar a lista de modelos
- Armazena em estado `availableModels: RemoteModel[]` e `modelsLoading: boolean`
- Para cada recurso de IA, renderiza `<ModelCombobox>` em vez de `<input type="text">`

---

## Arquivos criados

| Arquivo | Descricao |
|---|---|
| `components/ui/ModelCombobox.tsx` | Componente de combobox com busca e navegação por teclado |
| `app/api/admin/ai/models/route.ts` | API route que retorna modelos do OpenRouter |

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `lib/ai.ts` | Adicionada interface `OpenRouterModel` e funcao `fetchAvailableModels()` |
| `app/admin/configuracoes/ConfiguracoesClient.tsx` | Adicionado fetch de modelos no mount, substituicao de `<input>` por `<ModelCombobox>` |

---

## Fluxo de dados

```
Pagina carrega (ConfiguracoesClient mount)
  → fetch('/api/admin/ai/models')
    → app/api/admin/ai/models/route.ts
      → fetchAvailableModels() [lib/ai.ts]
        → GET https://openrouter.ai/api/v1/models (cache 1h)
        → filtra + ordena
      ← retorna [{ id, name, context_length, pricing }, ...]
    ← JSON response
  → setAvailableModels(data)

Usuario clica no combobox
  → Dropdown abre com input de busca
  → Digita "gpt"
    → Filtra modelos por id ou name contendo "gpt"
  → Seta para baixo / Enter
    → Seleciona modelo
  → onChange(feature, modelId)
    → Atualiza estado ai.models[feature] = modelId

Usuario clica "Salvar"
  → PUT /api/admin/settings { ai: { models: { ... } } }
    → Salva no banco (site_settings.ai_models)
```

---

## Prompt para replicar em outro projeto

O prompt abaixo pode ser usado para aplicar as mesmas funcionalidades em um projeto idêntico que ja possua a infraestrutura de IA via OpenRouter (doc #06). Basta colar o prompt na ferramenta de IA e ela criara tudo automaticamente.

---

```markdown
# Prompt: Substituir inputs de modelo por Combobox com busca via API do OpenRouter

## Contexto

Tenho um projeto Next.js 14 App Router com TypeScript e Tailwind CSS. O projeto ja possui:

- Modulo de IA em `lib/ai.ts` que centraliza chamadas ao OpenRouter (`callOpenRouter`, `aiChat`, `getAIApiKey`, `getAIModelFromDB`, etc.)
- Pagina de configuracoes admin em `app/admin/configuracoes/` com server component (`page.tsx`) e client component (`ConfiguracoesClient.tsx`)
- A secao de IA na pagina de configuracoes tem um campo de API key e inputs de texto simples para selecionar o modelo LLM de cada recurso
- API route de settings em `app/api/admin/settings/route.ts` com GET e PUT
- A marca usa a cor `brand-primary` no Tailwind (cor personalizada)
- Nao uso nenhuma lib de UI (sem headlessui, radix, shadcn, etc.) — tudo e custom com Tailwind

## Requisitos

- Substituir os inputs de texto para modelo por um **combobox com campo de busca** que carrega os modelos disponiveis diretamente da API do OpenRouter
- A busca deve filtrar por **nome do modelo** e **ID do modelo** em tempo real
- O combobox deve suportar **navegacao por teclado** (Arrow Up/Down, Enter, Escape)
- Criar uma **API route interna** para buscar os modelos do OpenRouter (nao chamar do client direto)
- Usar **cache** no servidor para nao bater na API do OpenRouter a cada request

## O que preciso que voce faca

### Passo 1: Adicionar `fetchAvailableModels()` no modulo de IA

No arquivo `lib/ai.ts`:

1. Adicionar a interface `OpenRouterModel`:
```ts
export interface OpenRouterModel {
  id: string
  name: string
  context_length: number
  pricing: {
    prompt: string | null
    completion: string | null
  }
}
```

2. Adicionar a funcao `fetchAvailableModels()`:
```ts
export async function fetchAvailableModels(): Promise<OpenRouterModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models from OpenRouter (${response.status})`)
  }

  const data = (await response.json()) as { data: OpenRouterModel[] }

  return data.data
    .filter((m) => m.id && m.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}
```

### Passo 2: Criar API route interna

Criar o arquivo `app/api/admin/ai/models/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { fetchAvailableModels } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const models = await fetchAvailableModels()
    return NextResponse.json(models)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar modelos do OpenRouter' }, { status: 500 })
  }
}
```

### Passo 3: Criar o componente ModelCombobox

Criar o arquivo `components/ui/ModelCombobox.tsx` com as seguintes especificacoes:

**Interface:**
```ts
interface ModelOption {
  id: string
  name: string
}

interface Props {
  value: string           // ID do modelo selecionado
  onChange: (value: string) => void
  models: ModelOption[]   // Lista de modelos disponiveis
  loading: boolean        // Se esta carregando
}
```

**Comportamento:**

1. **Estado fechado**: Exibe o modelo selecionado no formato `"Nome do Modelo (id/do/modelo)"`. Se nenhum modelo selecionado, exibe `"Selecione um modelo..."` em cinza. Tem uma seta (chevron SVG) que rotaciona quando abre.

2. **Ao clicar**: Abre o dropdown e substitui o texto exibido por um `<input>` de busca com placeholder `"Pesquisar modelo..."`. O input recebe foco automaticamente.

3. **Busca**: Filtra a lista de modelos onde `model.id.toLowerCase().includes(query)` ou `model.name.toLowerCase().includes(query)`. O filtro e em tempo real (onChange).

4. **Dropdown**: Lista com `max-height: 16rem` (max-h-64) e scroll vertical. Cada item mostra:
   - Nome do modelo (font-medium, truncate)
   - ID do modelo (text-xs, cinza, truncate)
   - O modelo atualmente selecionado recebe `bg-brand-primary text-white`
   - Hover e item com highlight de teclado recebem `bg-gray-100`
   - Click no item chama `onChange(model.id)` e fecha o dropdown

5. **Navegacao por teclado**:
   - Quando fechado: ArrowDown, Enter ou Espaco abrem o dropdown
   - Quando aberto: ArrowDown incrementa highlightIndex, ArrowUp decrementa (min 0), Enter seleciona o item highlightado, Escape fecha
   - O item highlightado faz scroll automatico para visibilidade (`scrollIntoView({ block: 'nearest' })`)
   - Ao digitar (mudar search), reseta highlightIndex para -1

6. **Click outside**: Listener de mousedown no document que fecha o dropdown se o click foi fora do container. Usa ref no div container.

7. **Estados especiais**:
   - `loading=true`: Exibe "Carregando modelos..."
   - `filtered.length === 0` com `models.length === 0`: "Nenhum modelo disponivel"
   - `filtered.length === 0` com modelos: "Nenhum modelo encontrado"

**Estilos Tailwind:**
- Container: `relative`
- Trigger: `flex items-center border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-gray-400 focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary bg-white`
- Input de busca: `flex-1 outline-none bg-transparent text-sm`
- Chevron: `w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform` + `rotate-180` quando aberto
- Dropdown: `absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1`
- Item normal: `px-3 py-2 text-sm cursor-pointer flex flex-col gap-0.5 hover:bg-gray-50`
- Item selecionado: `bg-brand-primary text-white`
- Item highlightado: `bg-gray-100`

### Passo 4: Integrar no ConfiguracoesClient

No arquivo `app/admin/configuracoes/ConfiguracoesClient.tsx`:

1. Adicionar import: `import { ModelCombobox } from '@/components/ui/ModelCombobox'`
2. Adicionar import: `useEffect` do React
3. Adicionar interface local:
```ts
interface RemoteModel {
  id: string
  name: string
}
```
4. Adicionar estados:
```ts
const [availableModels, setAvailableModels] = useState<RemoteModel[]>([])
const [modelsLoading, setModelsLoading] = useState(false)
```
5. Adicionar useEffect no mount:
```ts
useEffect(() => {
  setModelsLoading(true)
  fetch('/api/admin/ai/models')
    .then((res) => (res.ok ? res.json() : []))
    .then((data: RemoteModel[]) => setAvailableModels(data))
    .catch(() => setAvailableModels([]))
    .finally(() => setModelsLoading(false))
}, [])
```
6. Na secao de IA, para cada feature de IA, substituir o `<input type="text">` por:
```tsx
<div key={feature}>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {FEATURE_LABELS[feature] ?? feature}
  </label>
  <ModelCombobox
    value={model}
    onChange={(v) => handleAIModelChange(feature, v)}
    models={availableModels}
    loading={modelsLoading}
  />
</div>
```

### Passo 5: Verificacao

Rodar `npx tsc --noEmit` para garantir que nao ha erros de tipo.

## Convencoes

- Nao adicionar comentarios no codigo
- Seguir o estilo de codigo existente no projeto
- Usar Tailwind CSS para todo o estilo (sem CSS-in-JS, sem modulo CSS)
- Usar portugues para labels e mensagens visiveis ao usuario
- Usar ingles para nomes de variaveis, tipos e chaves
- Nao adicionar dependencias externas (libs de UI, headless, etc.)
- O componente deve ser 100% custom com React + Tailwind
```