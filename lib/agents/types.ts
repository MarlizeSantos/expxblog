// lib/agents/types.ts

export type AgentId =
  | 'headline'
  | 'researcher'
  | 'analyst'
  | 'copywriter'
  | 'reviewer'
  | 'cta'
  | 'designer'
  | 'publisher'

export interface AgentMeta {
  id: AgentId
  label: string
  description: string
  defaultPrompt: string
  defaultModel: string
  supportsImageModel: boolean
}

export const AGENT_DEFINITIONS: AgentMeta[] = [
  {
    id: 'headline',
    label: 'Gerador de Headline',
    description: 'Identifica um tema pendente e elabora o título do artigo.',
    defaultModel: 'openrouter/free',
    supportsImageModel: false,
    defaultPrompt: `Você é um especialista em headlines para blogs. Receberá um tema e deve criar um título de artigo atraente, com até 80 caracteres, que seja claro, específico e gere curiosidade. Responda APENAS com o título, sem aspas ou pontuação extra.`,
  },
  {
    id: 'researcher',
    label: 'Pesquisador',
    description: 'Busca links e referências relevantes na internet sobre o título do artigo.',
    defaultModel: 'openrouter/free',
    supportsImageModel: false,
    defaultPrompt: `Você é um pesquisador especializado em encontrar fontes confiáveis na internet. Dado um título de artigo, gere de 5 a 8 URLs reais de fontes relevantes: Wikipedia, portais de negócios brasileiros (sebrae.com.br, endeavor.org.br, exame.com, hbrbrasil.uol.com.br, resultadosdigitais.com.br, rockcontent.com, neilpatel.com/br), blogs especializados ou sites institucionais. Gere URLs específicas e reais que provavelmente existam para o tema. Responda APENAS em JSON válido: { "urls": ["https://...", "https://...", ...] }`,
  },
  {
    id: 'analyst',
    label: 'Analista',
    description: 'Lê o conteúdo de cada link encontrado e produz um resumo detalhado.',
    defaultModel: 'openrouter/free',
    supportsImageModel: false,
    defaultPrompt: `Você é um analista de conteúdo. Receberá o título de um artigo e o texto extraído de uma fonte. Produza um resumo detalhado (200-400 palavras) com os principais pontos, dados e insights relevantes para o artigo. Responda apenas com o resumo em português.`,
  },
  {
    id: 'copywriter',
    label: 'Copywriter',
    description: 'Escreve o artigo completo em HTML com base no título e nos resumos.',
    defaultModel: 'openrouter/free',
    supportsImageModel: false,
    defaultPrompt: `Você é um redator profissional de blogs corporativos. Receberá um título, o tema, o briefing da empresa e resumos de fontes pesquisadas (cada uma com URL e conteúdo). Escreva um artigo completo, detalhado e envolvente em HTML (use h2, h3, p, strong, em, ul, ol, li, blockquote). Mínimo 800 palavras. Inclua introdução, desenvolvimento com subtítulos e conclusão.

REGRA OBRIGATÓRIA SOBRE LINKS: Sempre que mencionar um dado, estatística, pesquisa, conceito ou informação que veio de uma das fontes pesquisadas, insira um link inline na palavra ou expressão relevante usando a tag <a href="URL_DA_FONTE" target="_blank" rel="noopener noreferrer">palavra ou expressão</a>. Use a URL exata da fonte fornecida. Não crie seção de referências separada — os links devem aparecer naturalmente no corpo do texto. Inclua ao menos um link por fonte utilizada.

Responda em JSON: { "title": "...", "excerpt": "até 160 caracteres", "content": "HTML completo" }`,
  },
  {
    id: 'reviewer',
    label: 'Revisor',
    description: 'Verifica ortografia, coerência e conformidade com as regras configuradas.',
    defaultModel: 'openrouter/free',
    supportsImageModel: false,
    defaultPrompt: `Você é um revisor editorial rigoroso. Analise o artigo recebido verificando: ortografia, gramática, coerência, clareza, estrutura e tom. Se aprovado, responda em JSON: { "approved": true }. Se houver problemas, responda: { "approved": false, "issues": ["problema 1", "problema 2"] }. Seja objetivo e específico.`,
  },
  {
    id: 'cta',
    label: 'Agente de CTA',
    description: 'Insere um parágrafo de call-to-action ao final do artigo.',
    defaultModel: 'openrouter/free',
    supportsImageModel: false,
    defaultPrompt: `Você é um especialista em marketing de conteúdo. Receberá um artigo completo e o briefing da empresa. Crie um parágrafo de call-to-action (CTA) que se conecte naturalmente ao conteúdo do artigo e leve o leitor à ação desejada pela empresa. Responda APENAS com o parágrafo HTML do CTA (use <p> com classes ou <div>), sem explicações.`,
  },
  {
    id: 'designer',
    label: 'Designer de Capa',
    description: 'Extrai o melhor prompt de imagem e gera a capa do artigo via IA.',
    defaultModel: 'openai/gpt-5-image',
    supportsImageModel: true,
    defaultPrompt: `You are a visual art director. You will receive the title and summary of an article. Based on the specific topic described in the article, create an image generation prompt that visually represents the core concept or theme — not a generic blog or office scene. The prompt should describe the main subject directly tied to the article topic, a fitting visual composition, a color palette that suits the subject matter, and a style that best conveys the essence of the content (choose the style based on the topic, do not default to photorealistic or corporate). Avoid depicting generic people, office environments, or business settings unless the article is explicitly about those subjects. Focus on the concept, idea, or subject matter of the article. The generated image must contain absolutely no text, letters, words, numbers, labels, signs, or written characters of any kind. Respond ONLY with the prompt in English, no explanations.`,
  },
  {
    id: 'publisher',
    label: 'Publicador',
    description: 'Publica o artigo e dispara os gatilhos configurados.',
    defaultModel: 'openrouter/free',
    supportsImageModel: false,
    defaultPrompt: ``,
  },
]

export interface AgentContext {
  themeId?: number
  themeTitle?: string
  themeDescription?: string | null
  briefing?: string
  headline?: string
  pastedText?: string
  researchLinks?: string[]
  sourceSummaries?: { url: string; summary: string }[]
  articleTitle?: string
  articleExcerpt?: string
  articleContent?: string
  reviewCycles?: number
  coverImageUrl?: string | null
  postId?: number
}

export interface AgentResult {
  success: boolean
  message: string
  data?: Partial<AgentContext>
  error?: string
}

export type PipelineEventType =
  | 'agent_start'
  | 'agent_done'
  | 'agent_error'
  | 'agent_retry'
  | 'pipeline_done'
  | 'pipeline_error'
  | 'log'

export interface PipelineEvent {
  type: PipelineEventType
  agent?: AgentId
  message: string
  data?: Record<string, unknown>
  timestamp: string
}

export interface PublisherTriggers {
  publishStatus: 'draft' | 'published'
}
