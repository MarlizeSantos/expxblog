import { getAppUrl } from '@/lib/app-url'

export type AIFeature =
  | 'content_generation'
  | 'title_suggestion'
  | 'excerpt_generation'
  | 'seo_optimization'
  | 'image_description'
  | 'summarization'
  | string

const DEFAULT_MODELS: Record<string, string> = {
  content_generation: 'openai/gpt-4o-mini',
  title_suggestion: 'openai/gpt-4o-mini',
  excerpt_generation: 'openai/gpt-4o-mini',
  seo_optimization: 'openai/gpt-4o-mini',
  image_description: 'openai/gpt-4o-mini',
  image_generation: 'openai/gpt-5-image',
  summarization: 'openai/gpt-4o-mini',
  briefing_generation: 'openai/gpt-4o-mini',
  prompt_generation: 'openai/gpt-4o-mini',
  theme_suggestion: 'openai/gpt-4o-mini',
}

export function getDefaultModels(): Record<string, string> {
  return { ...DEFAULT_MODELS }
}

export function getDefaultModel(feature: AIFeature): string {
  return DEFAULT_MODELS[feature] ?? 'openai/gpt-4o-mini'
}

export async function getAIApiKey(): Promise<string | null> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')

    const row = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'ai_api_key'))
      .limit(1)

    return (row.length > 0 && row[0].value) ? row[0].value : null
  } catch {
    return null
  }
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterOptions {
  model: string
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  signal?: AbortSignal
}

export interface OpenRouterResponse {
  id: string
  choices: {
    index: number
    message: { role: string; content: string }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function callOpenRouter(
  options: OpenRouterOptions,
  apiKey?: string
): Promise<OpenRouterResponse> {
  const key = apiKey ?? (await getAIApiKey())

  if (!key) {
    throw new Error('Chave de API do OpenRouter não configurada. Configure em Configurações → IA.')
  }

  const timeout = AbortSignal.timeout(180_000)
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': getAppUrl(),
      'X-Title': process.env.NEXT_PUBLIC_BLOG_NAME ?? 'Blog',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1024,
      ...(options.top_p !== undefined ? { top_p: options.top_p } : {}),
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`)
  }

  return response.json() as Promise<OpenRouterResponse>
}

export async function getAIModelFromDB(feature: AIFeature): Promise<string> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')

    const row = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'ai_models'))
      .limit(1)

    if (row.length > 0 && row[0].value) {
      const models = JSON.parse(row[0].value) as Record<string, string>
      if (models[feature]) {
        return models[feature]
      }
    }
  } catch {}

  return getDefaultModel(feature)
}

export interface OpenRouterModel {
  id: string
  name: string
  context_length: number
  pricing: {
    prompt: string | null
    completion: string | null
  }
}

const IMAGE_MODELS: OpenRouterModel[] = [
  { id: 'openai/gpt-5-image', name: 'OpenAI: GPT-5 Image', context_length: 0, pricing: { prompt: null, completion: null } },
  { id: 'openai/gpt-5-image-mini', name: 'OpenAI: GPT-5 Image Mini', context_length: 0, pricing: { prompt: null, completion: null } },
  { id: 'openai/gpt-5.4-image-2', name: 'OpenAI: GPT-5.4 Image 2', context_length: 0, pricing: { prompt: null, completion: null } },
  { id: 'google/gemini-2.5-flash-image', name: 'Google: Gemini 2.5 Flash Image', context_length: 0, pricing: { prompt: null, completion: null } },
  { id: 'google/gemini-3.1-flash-image-preview', name: 'Google: Gemini 3.1 Flash Image', context_length: 0, pricing: { prompt: null, completion: null } },
  { id: 'google/gemini-3-pro-image-preview', name: 'Google: Gemini 3 Pro Image', context_length: 0, pricing: { prompt: null, completion: null } },
]

export async function fetchAvailableModels(): Promise<OpenRouterModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models from OpenRouter (${response.status})`)
  }

  const data = (await response.json()) as { data: OpenRouterModel[] }

  const chatModels = data.data.filter((m) => m.id && m.name)

  const chatIds = new Set(chatModels.map((m) => m.id))
  const extraImageModels = IMAGE_MODELS.filter((m) => !chatIds.has(m.id))

  return [...chatModels, ...extraImageModels].sort((a, b) => a.name.localeCompare(b.name))
}

export async function aiChat(
  feature: AIFeature,
  messages: OpenRouterMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const model = await getAIModelFromDB(feature)

  const response = await callOpenRouter({
    model,
    messages,
    temperature: options?.temperature,
    max_tokens: options?.max_tokens,
  })

  return response.choices[0]?.message?.content ?? ''
}

export async function callOpenRouterImage(
  prompt: string,
  model?: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey ?? (await getAIApiKey())

  if (!key) {
    throw new Error('Chave de API do OpenRouter não configurada. Configure em Configurações → IA.')
  }

  const resolvedModel = model ?? (await getAIModelFromDB('image_generation'))

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(180_000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': getAppUrl(),
      'X-Title': process.env.NEXT_PUBLIC_BLOG_NAME ?? 'Blog',
    },
    body: JSON.stringify({
      model: resolvedModel,
      modalities: ['text', 'image'],
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenRouter Image API error (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as {
    choices: {
      message: {
        content?: string
        images?: { image_url: { url: string } }[]
      }
    }[]
  }

  console.log('OpenRouter image response:', JSON.stringify(data.choices?.[0]?.message ?? {}).substring(0, 500))

  const msg = data.choices?.[0]?.message

  if (msg?.images && msg.images.length > 0) {
    return msg.images[0].image_url.url
  }

  if (msg?.content && typeof msg.content === 'string') {
    const base64Match = msg.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)
    if (base64Match) {
      return base64Match[0]
    }

    const urlMatch = msg.content.match(/https?:\/\/[^\s"')\]]+\.(png|jpg|jpeg|webp|gif)[^\s"')\]]*/i)
    if (urlMatch) {
      return urlMatch[0]
    }
  }

  if (msg?.content && Array.isArray(msg.content)) {
    for (const part of msg.content as Array<Record<string, unknown>>) {
      if (part.type === 'image_url' && part.image_url && typeof part.image_url === 'object') {
        const url = (part.image_url as { url?: string }).url
        if (url) return url
      }
      if (part.type === 'image' && part.source && typeof part.source === 'object') {
        const src = part.source as { data?: string; type?: string }
        if (src.data) return `data:image/png;base64,${src.data}`
      }
    }
  }

  throw new Error('IA não retornou imagem. Resposta: ' + JSON.stringify(data).substring(0, 300))
}

export async function getPromptFromDB(key: string): Promise<string> {
  try {
    const { db } = await import('@/drizzle/db')
    const { siteSettings } = await import('@/drizzle/schema')
    const { eq } = await import('drizzle-orm')

    const row = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'prompts'))
      .limit(1)

    if (row.length > 0 && row[0].value) {
      const prompts = JSON.parse(row[0].value) as Record<string, string>
      return prompts[key] ?? ''
    }
  } catch {}

  return ''
}
