# Bug: Categorização de artigos incorreta no pipeline de geração

**Data**: 2026-06-02  
**Severidade**: ALTO  
**Status**: RESOLVIDO

## Descrição do problema
Artigos gerados automaticamente pelo pipeline estavam sendo classificados em categorias semanticamente incorretas. Exemplo: "Desvendando Hooks: Automação Eficiente na Claude Code para Desenvolvedores" foi categorizado como "Gestão de Pessoas".

## Causa-raiz
**Arquivo**: `lib/agents/publisher.ts`  
**Tipo**: Lógica

O Publisher usava matching por palavras-chave para decidir a categoria do artigo: contava quantas palavras do nome da categoria apareciam no título. O algoritmo nunca verificava se o score resultante era maior que zero. Quando nenhuma palavra da categoria aparecia no título, todas as categorias ficavam com score 0. O `Array.sort()` do JS é instável em empates, então a "vencedora" entre scores zerados era escolhida arbitrariamente pela ordem de retorno do banco — resultando em categorias aleatórias para artigos sobre temas não cobertos pelas palavras-chave das categorias.

Adicionalmente, o bloco `catch {}` era vazio, silenciando qualquer falha de categorização (incluindo ausência de chave de API) sem nenhum log.

## Solução aplicada
Substituída a lógica de keyword-matching por uma chamada semântica via `aiChat('category_matching', ...)`. O modelo recebe o título do artigo e a lista de categorias disponíveis e retorna o ID da categoria mais adequada, ou `"none"` se nenhuma for relevante. O insert em `post_categories` só ocorre quando o modelo retorna um ID válido (não `"none"`, `parseInt` bem-sucedido, ID existente no banco). O `catch` passou a logar o erro via `console.warn` para rastreabilidade.

**Arquivos modificados**:
- `lib/agents/publisher.ts` — substituição do bloco de categorização por `aiChat` semântico + guard `isNaN` + `catch` com log
- `lib/ai.ts` — adição de `category_matching: 'openai/gpt-4o-mini'` ao `DEFAULT_MODELS`
- `app/admin/configuracoes/ConfiguracoesClient.tsx` — adição do label `'Categorização de Artigos'` + correção dos `setTimeout` ausentes nos handlers de toast

## Como reproduzir (antes da correção)
1. Criar categorias no painel admin (ex: "Gestão de Pessoas", "Tecnologia")
2. Disparar o pipeline de geração com tema sobre desenvolvimento de software
3. O artigo gerado seria classificado em categoria aleatória (frequentemente a primeira retornada pelo banco)

## Como verificar (após a correção)
- [ ] Gerar artigo sobre desenvolvimento de software e confirmar que recebe categoria de tecnologia
- [ ] Gerar artigo com tema fora de todas as categorias existentes e confirmar que fica sem categoria
- [ ] `npm run build` passa sem erros TypeScript
- [ ] `npm run lint` limpo

## Lições aprendidas
Algoritmos de matching por palavras-chave para classificação semântica são frágeis e nunca devem ser usados sem threshold mínimo de score. Para decisões semânticas, use sempre `aiChat()` — o projeto já tem a infraestrutura em `lib/ai.ts` para isso. Todo `catch {}` vazio em código de pipeline deve ao menos logar o erro para rastreabilidade operacional.
