# Bug: Warning react-hooks/exhaustive-deps em ArtigosClient

**Data**: 2026-06-04
**Severidade**: BAIXO
**Status**: RESOLVIDO

## Descrição do problema
O build da Vercel emitia o warning do ESLint:

```
207:37  Warning: React Hook useEffect has a missing dependency: 'fetchPosts'.
Either include it or remove the dependency array.  react-hooks/exhaustive-deps
```

## Causa-raiz
**Arquivo**: `app/admin/artigos/ArtigosClient.tsx`
**Linha**: 207
**Tipo**: UI / hooks (lint)

O `useEffect` chamava `fetchPosts()` mas declarava apenas `[status]` no array de dependências. Como `fetchPosts` era uma função recriada a cada render e referenciada dentro do efeito, a regra `react-hooks/exhaustive-deps` exigia que ela constasse nas dependências. Incluí-la cruamente criaria uma nova referência a cada render e dispararia o efeito em loop — por isso a correção exige estabilizar a função antes de listá-la.

## Solução aplicada
`fetchPosts` foi envolvida em `useCallback` com dependência `[status]`, de modo que sua referência só muda quando `status` muda. O `useEffect` passou a depender de `[fetchPosts]`, satisfazendo a regra sem criar loop. `handleDelete`, que também usa `fetchPosts`, continua válido pois a referência permanece estável entre renders.

**Arquivos modificados**:
- `app/admin/artigos/ArtigosClient.tsx` — `useCallback` adicionado ao import de `react`; `fetchPosts` convertida de `async function` para `const fetchPosts = useCallback(async () => {...}, [status])`; deps do `useEffect` alteradas de `[status]` para `[fetchPosts]`

## Como reproduzir (antes da correção)
1. Rodar `npm run lint` ou `npm run build`
2. Observar o warning `react-hooks/exhaustive-deps` apontando a linha 207
3. Resultado esperado: lint limpo · Resultado real: warning emitido

## Como verificar (após a correção)
- [x] `npm run lint` sem o warning na linha 207
- [x] `npm run build` passa
- [x] Filtros (all/published/draft) ainda recarregam a lista
- [x] Exclusão de artigo ainda recarrega a lista via `handleDelete`

## Lições aprendidas
Quando um `useEffect` chama uma função local que lê estado/props, estabilize a função com `useCallback` (com as deps que ela realmente usa) e liste a função no array de deps do efeito — em vez de listar o estado diretamente e ignorar a regra. Isso satisfaz `exhaustive-deps` sem mascarar dependências reais nem criar loops de render.
