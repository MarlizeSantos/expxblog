# Bug: Agente Designer gera imagens de escritório mesmo sem prompt configurado

**Data**: 2026-06-03  
**Severidade**: MÉDIO  
**Status**: RESOLVIDO  

## Descrição do problema
Mesmo sem nenhum texto configurado no prompt do agente Designer, todas as imagens de capa geradas pelo pipeline eram de pessoas em escritório ou cenas corporativas genéricas.

## Causa-raiz
**Arquivo**: `lib/agents/types.ts`  
**Linha**: 81  
**Tipo**: Lógica — prompt padrão hardcoded com viés temático

O `defaultPrompt` do agente `designer` instruía o GPT-4o-mini a criar um prompt de imagem "profissional e atrativa para blog" com estilos sugeridos "fotorrealista, editorial". Esse framing, sem ancoragem no tema do artigo, fazia o modelo gerar sistematicamente prompts com cenários corporativos/escritório — especialmente em artigos de negócios, marketing e tecnologia. Não havia termos hardcoded como "office" ou "people", mas o viés estava no framing genérico do prompt.

## Solução aplicada
Reescrita do `defaultPrompt` do agente `designer` para:
- Ancorar a imagem no **tema específico do artigo** (título + resumo)
- Não sugerir "fotorrealista" ou "editorial" como estilo padrão — o estilo deve ser escolhido conforme o tema
- Instruir explicitamente a **evitar** pessoas genéricas, escritórios ou cenas de negócios, a menos que o artigo trate explicitamente desses assuntos
- Focar no conceito/ideia/tema do artigo, não em um estereótipo de blog corporativo

**Arquivo modificado**:
- `lib/agents/types.ts` — `defaultPrompt` do agente `designer` reescrito

## Como reproduzir (antes da correção)
1. Deixar o campo de prompt do Designer vazio na UI de configuração de agentes
2. Executar o pipeline de geração de artigo sobre qualquer tema (ex: "Como melhorar sua produtividade")
3. Resultado: imagem de capa com pessoas em escritório ou cena corporativa, independente do tema

## Como verificar (após a correção)
- [ ] Gerar artigo via pipeline com prompt do Designer vazio e verificar que a imagem reflete o tema, não um escritório
- [ ] Testar com temas variados (tecnologia, saúde, culinária) para confirmar que o estilo varia conforme o assunto
- [ ] `npm run build` passa
- [ ] `npm run lint` limpo

## Lições aprendidas
Prompts padrão com framing genérico como "profissional" ou "editorial" introduzem viés sistêmico nos modelos de imagem. Prompts de fallback devem sempre ancorar no contexto específico fornecido (título/resumo do artigo) e evitar palavras que induzam estilos corporativos quando o objetivo é ser neutro.
