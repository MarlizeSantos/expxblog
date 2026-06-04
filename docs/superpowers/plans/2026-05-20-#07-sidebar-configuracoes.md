# Sidebar de Navegação na Tela de Configurações

**Data:** 2026-05-20

## Resumo

Refatoração da tela `/admin/configuracoes` para substituir o layout de cards empilhados verticalmente por um layout com sidebar de navegação à esquerda e conteúdo dinâmico à direita.

---

## O que foi feito

### Layout anterior

Todos os cards (Blog, Dados da Empresa, Redes Sociais, IA, API) eram renderizados simultaneamente em uma coluna única (`<div className="space-y-8">`), exigindo scroll para acessar seções inferiores.

### Layout atual

```
┌──────────────┬─────────────────────────────────┐
│  Sidebar     │  Conteúdo                       │
│              │                                 │
│  ■ Blog      │  (formulário da seção ativa)    │
│  □ Empresa   │                                 │
│  □ Redes     │                                 │
│  □ IA        │                                 │
│  □ API       │                                 │
│              │                                 │
└──────────────┴─────────────────────────────────┘
```

- **Sidebar** (`<nav>` com `w-56 shrink-0`): lista de botões estilizados. O item ativo recebe `bg-brand-primary text-white`.
- **Conteúdo** (`flex-1 min-w-0`): renderiza apenas a seção selecionada via `switch/case`.
- Botão "Salvar alterações" permanece no topo e no rodapé.

### Arquivo alterado

- `app/admin/configuracoes/ConfiguracoesClient.tsx` — única alteração.

### Mudanças técnicas

1. Adicionado `type SectionId = 'blog' | 'empresa' | 'redes' | 'ia' | 'api'` e `useState<SectionId>('blog')`.
2. Criado array `SIDEBAR_ITEMS` com `id`, `label` e `icon` para cada seção.
3. `SECTIONS` (que era um array de objetos com `title` e `fields`) virou um `Record<string, {...}>` indexado pelo `SectionId`.
4. Função `renderContent()` com `switch(activeSection)` retorna o JSX da seção correspondente.
5. JSX principal passou de `<div className="space-y-8">` (coluna única) para `<div className="flex gap-6">` (sidebar + conteúdo).

---

## Prompt para reproduzir em outro projeto

> Na minha página de configurações (admin), hoje todas as seções aparecem como cards empilhados verticalmente (uma abaixo da outra). Quero que você refatore para um layout com sidebar de navegação à esquerda e conteúdo à direita.
>
> **Requisitos:**
> - Criar uma sidebar fixa à esquerda (largura ~224px / `w-56`) com botões para cada seção da tela de configurações.
> - Ao clicar em um item da sidebar, o conteúdo à direita muda para mostrar apenas aquela seção.
> - O item ativo da sidebar deve ficar visualmente destacado (ex: cor primária do brand, fundo colorido com texto branco).
> - Os itens inativos devem ter hover suave (ex: `hover:bg-gray-50`).
> - Cada item da sidebar deve ter um ícone/emoji e o nome da seção.
> - O conteúdo à direita deve ocupar o espaço restante com `flex-1 min-w-0`.
> - Manter os botões de ação (salvar) no topo e no rodapé, fora do par sidebar+conteúdo.
> - Usar state local (`useState`) para controlar qual seção está ativa, com tipo union string.
> - Não mudar nenhuma lógica de salvamento, chamadas de API ou estrutura de dados — apenas o layout visual.
> - A sidebar deve ser um elemento `<nav>` com `<ul>` e `<li>` semantically corretos.
> - Usar classes Tailwind CSS para todo o estilo, seguindo as cores do brand (`brand-primary`, `brand-secondary`, `neutral-900`).
