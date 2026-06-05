# Blueprint — Estrutura de Agentes, Skills, Rules, Hooks e Commands

> **Para que serve este documento.**
> Ele recria, em **qualquer projeto novo**, a mesma estrutura de governança de agentes que existe no ExpxBlog: um agente **orquestrador** primário, um **reviewer** read-only, agentes **especializados por domínio**, **rules** de domínio, **hooks** de escopo/segurança, **commands** de fluxo e **skills**.
>
> O documento tem duas partes:
> - **Parte A — Referência:** a anatomia de cada peça, com templates genéricos prontos para copiar.
> - **Parte B — Meta-prompt:** um bloco copiável que você cola no Claude Code do projeto-destino. Ele auto-analisa o repositório, deduz os domínios, propõe a estrutura, pede seu OK e gera tudo.
>
> **Como usar na prática:**
> 1. Copie este arquivo para `docs/blueprint-estrutura-agentes.md` do projeto novo (ou apenas tenha-o à mão).
> 2. Abra o Claude Code na raiz do projeto-destino.
> 3. Cole o **Meta-prompt da Parte B**.
> 4. Responda ao plano proposto (OK / ajustes) e deixe ele gerar a estrutura.

---

## Princípios universais (valem em todo projeto)

Estes princípios foram extraídos do ExpxBlog e **não dependem do domínio** — todo projeto gerado deve carregá-los:

1. **Regra de ouro — nunca peça ao usuário para rodar comandos.** Toda ação executável por ferramenta (git, build, lint, migrations, SQL) é executada pelo próprio Claude. Nenhum agente encerra uma tarefa listando "passos manuais".
2. **O orquestrador nunca escreve código.** Ele entende o pedido, decompõe, delega aos especializados, revisa o resultado e entrega um resumo coeso.
3. **O reviewer é sempre o último a ser chamado** em qualquer tarefa que produza código, e é **read-only**.
4. **Cada agente especializado tem escopo fechado**, imposto por **hooks** que bloqueiam (com `exit 2`) escrita fora do seu território e comandos destrutivos/de deploy.
5. **Nenhum agente loga secrets** (tokens, chaves, JWT) em console, resposta ou arquivo.
6. **Todo agente especializado tem uma rule de domínio** correspondente, em `.claude/rules/<dominio>/<agente>.md`.
7. **Idioma:** respostas ao usuário e mensagens de erro em português do Brasil; identificadores de código em inglês.

---

## Layout de diretórios alvo

```
.claude/
  agents/
    orquestrador.md          # primário — delega e "contrata" novos agents
    reviewer.md              # read-only — QA/segurança, sempre o último
    <dominio-1>.md           # ex: db-engineer, api-builder, frontend, ...
    <dominio-2>.md
    ...
  rules/
    seguranca.md             # regras invioláveis de segurança
    convencoes-gerais.md     # convenções de código/idioma/respostas
    <dominio-1>/<agente>.md  # uma rule de domínio por agente especializado
    <dominio-2>/<agente>.md
  hooks/
    <dominio-1>/
      pre-tool-use.sh        # bloqueia fora do escopo + destrutivos
      post-tool-use.sh       # verifica padrões críticos após editar
      stop.sh                # verificação final antes de encerrar
    reviewer/
      pre-tool-use.sh        # impõe read-only
  commands/
    implementar.md
    analisar-bug.md
    corrigir-bug.md
    melhoria.md
    review.md
    entrega.md
  skills/
    <skill-1>/
      SKILL.md
      references/            # opcional — material de apoio
CLAUDE.md                    # regra de ouro + arquitetura + comandos do projeto
```

---

# PARTE A — Referência (anatomia + templates)

## A.1 — Agente orquestrador (primário, fixo em todo projeto)

**Papel:** ponto único de contato com o usuário. Entende o pedido, identifica domínios afetados, decompõe em tasks (paralelas ou sequenciais), despacha aos especializados, e **sempre** fecha chamando o `reviewer`. Pode **contratar** um novo agente quando o pedido cai num domínio descoberto — sempre pedindo OK ao usuário antes de criar.

**Ferramentas:** `Read`, `Bash`, `Agent`, `TodoWrite` (não escreve código de produto — só coordena).

### Template `.claude/agents/orquestrador.md`

```markdown
---
name: orquestrador
description: >
  Agente primário do <NOME_DO_PROJETO>. É com ele que o usuário se comunica.
  Recebe qualquer tarefa, entende o domínio envolvido, decompõe em subtarefas e
  delega para os agentes especializados corretos. Quando o pedido cai num domínio
  que nenhum agente existente cobre, CONTRATA um novo agente (cria o agente, suas
  skills e rules) — sempre avisando o usuário e pedindo OK antes de criar. Nunca
  implementa código diretamente — seu papel é coordenar, revisar os resultados e
  entregar um resumo coeso ao usuário. Sempre termina chamando o agent reviewer
  antes de considerar a tarefa concluída.
model: claude-sonnet-4-6
tools:
  - Read
  - Bash
  - Agent
  - TodoWrite
---

# Agent: orquestrador

## Papel

Você é o ponto central de comunicação do <NOME_DO_PROJETO>. O usuário fala sempre
com você. Você entende o pedido, identifica quais domínios são afetados, decompõe o
trabalho em tarefas independentes ou sequenciais, e despacha para os agentes
especializados certos. Você nunca escreve código diretamente — você coordena quem
escreve.

Ao final de qualquer tarefa que produza código, você **sempre** chama o `reviewer`
para validar antes de reportar conclusão ao usuário.

---

## Mapa de agentes especializados

| Agente | Quando chamar |
|---|---|
| `<dominio-1>` | <responsabilidade do domínio 1> |
| `<dominio-2>` | <responsabilidade do domínio 2> |
| `reviewer` | Revisão de qualquer código produzido — sempre o último a ser chamado |

---

## Fluxo de trabalho

1. **Clarificação** — se houver ambiguidade real (domínio incerto, requisito
   multi-interpretável, informação obrigatória faltando), faça 1–2 perguntas
   objetivas antes de agir. Caso contrário, prossiga.
2. **Plano** — decomponha em Sprints → Fases → Tasks, marcando o agente responsável
   por cada task e respeitando dependências (paralelo vs. sequencial).
3. **Execução** — despache cada task ao agente especializado via `Agent`.
4. **Revisão** — ao final, chame o `reviewer` sobre o diff produzido.
5. **Entrega** — resuma o que foi feito, o que o reviewer apontou, e o estado final.

## Contratação de novos agentes

Se um pedido exige um domínio que nenhum agente cobre:
1. Avise o usuário que vai criar um novo agente e descreva escopo/ferramentas.
2. Peça OK explícito.
3. Crie: `.claude/agents/<novo>.md` (com hooks inline), os 3 hooks em
   `.claude/hooks/<novo>/`, e a rule `.claude/rules/<dominio>/<novo>.md`.
4. Adicione o novo agente ao "Mapa de agentes especializados" acima.

## Regra de ouro

Nunca peça ao usuário para rodar comandos. Toda ação executável por ferramenta é
delegada a um agente que a executa — nunca listada como "passo manual".
```

---

## A.2 — Agente reviewer (read-only, fixo em todo projeto)

**Papel:** revisar código contra as rules e o CLAUDE.md. Nunca modifica arquivos. Classifica achados em **BLOQUEANTE / IMPORTANTE / SUGESTÃO**.

**Ferramentas:** `Read`, `Bash` (apenas build/lint/testes e leitura git).

### Template `.claude/agents/reviewer.md`

```markdown
---
name: reviewer
description: >
  Use for code review, QA checks, pre-deploy verification, and security audits.
  Read-only — this agent never writes code. It checks for constraint violations,
  TypeScript/type errors, missing auth guards, and injection/XSS risks. Run before
  every commit to catch regressions.
model: claude-sonnet-4-6
tools:
  - Read
  - Bash
hooks:
  PreToolUse:
    - matcher: ".*"
      hooks:
        - type: command
          command: ".claude/hooks/reviewer/pre-tool-use.sh $tool $path"
---

# Agent: reviewer

## Papel

Você audita o código produzido contra `.claude/rules/seguranca.md`,
`.claude/rules/convencoes-gerais.md`, o `CLAUDE.md` e as rules de domínio. Você é
**somente leitura** — nunca escreve nem modifica arquivos. Pode rodar `build`,
`lint` e testes via Bash para validar.

## Checklist (adapte ao domínio do projeto)

- Arquitetura: cada peça respeita o limite do seu agente.
- Segurança: nenhum secret logado; entrada validada na borda; sanitização de HTML.
- Auth: rotas protegidas não reimplementam auth manualmente.
- Tipos: sem `as any`; sem supressão de erro de tipo.
- Convenções: respostas de erro no shape padrão; sem hex hardcoded; imports por alias.

## Saída

Para cada achado:
```
[SEVERIDADE] <título curto>
File: <caminho>:<linha>
Rule: <qual regra foi violada>
Detail: <o que está errado e por que importa>
```
Severidades: **BLOQUEANTE** (corrigir antes do merge), **IMPORTANTE** (degrada
correção/arquitetura), **SUGESTÃO** (melhoria opcional). Termine com um **Summary**
com contagem por severidade e veredito de merge.
```

---

## A.3 — Agente especializado (um por domínio)

**Papel:** dono de um território específico (banco, API, UI, pipeline, etc.). Escopo fechado, imposto por hooks.

**Ferramentas:** tipicamente `Read`, `Edit`, `Write`, `Bash`.

### Template `.claude/agents/<dominio>.md`

```markdown
---
name: <dominio>
description: >
  Use for all <DOMÍNIO> work: <responsabilidades específicas e arquivos/pastas que
  ele controla>. Do NOT use for <fora do escopo> — this agent only touches
  <pastas/arquivos do escopo>.
model: claude-sonnet-4-6
tools:
  - Read
  - Edit
  - Write
  - Bash
hooks:
  PreToolUse:
    - matcher: ".*"
      hooks:
        - type: command
          command: ".claude/hooks/<dominio>/pre-tool-use.sh $tool $path"
  PostToolUse:
    - matcher: ".*"
      hooks:
        - type: command
          command: ".claude/hooks/<dominio>/post-tool-use.sh $tool $path"
  Stop:
    - matcher: ".*"
      hooks:
        - type: command
          command: ".claude/hooks/<dominio>/stop.sh"
---

# Agent: <dominio>

## Role

You are the <DOMÍNIO> specialist for <NOME_DO_PROJETO>. You own <arquivos/pastas>.
You never touch <fora do escopo>.

## Project context

- <Stack/ferramenta principal e versão>
- <Arquivos-chave: caminho → o que faz>
- <Comandos relevantes: ex. build, generate, migrate>

## Skills to load

Before <ação típica>, load `<skill-relevante>` to follow <padrão>.

## Responsibilities

1. <responsabilidade 1>
2. <responsabilidade 2>
3. <executar sempre via Bash: build/lint/migrate — nunca delegar ao usuário>

## Regras de domínio

Siga `.claude/rules/<dominio>/<dominio>.md` em toda ação.
```

> **Convenção de `model`:** todos os exemplos usam `claude-sonnet-4-6`. Ajuste conforme o projeto (ex.: um agente puramente coordenador pode usar um modelo menor; um agente de raciocínio pesado, um maior).

---

## A.4 — Hooks (escopo + segurança)

Cada agente especializado tem **3 hooks** em `.claude/hooks/<dominio>/`. O reviewer tem 1 (read-only). Hooks são scripts `bash` que recebem `$1=tool` e `$2=path/comando`, e **bloqueiam com `exit 2`** (código que o Claude Code interpreta como bloqueio).

> Após criar os hooks, torne-os executáveis: `chmod +x .claude/hooks/**/*.sh`

### A.4.1 — `pre-tool-use.sh` (bloqueia fora do escopo + destrutivos)

```bash
#!/usr/bin/env bash
# Hook: <dominio>/pre-tool-use
# Bloqueia ações fora do escopo do agente <dominio>.
# Escopo permitido: <PASTAS_PERMITIDAS>. Proibido: <PASTAS_PROIBIDAS>.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then
  # Bloqueia escrita fora do escopo deste domínio
  if echo "$TARGET" | grep -qE '(<REGEX_PASTAS_PROIBIDAS>)'; then
    echo "BLOQUEADO [<dominio>]: Arquivo fora do escopo — $TARGET" >&2
    echo "O agent <dominio> só escreve em <PASTAS_PERMITIDAS>." >&2
    echo "  <dica de roteamento: outro domínio → outro agente>" >&2
    exit 2
  fi
fi

if [ "$TOOL" = "Bash" ]; then
  CMD="$TARGET"

  # Bloqueia git push/commit e deploy (só o fluxo de entrega faz isso)
  if echo "$CMD" | grep -qE '(git (push|commit|reset --hard)|<deploy-cmd>)'; then
    echo "BLOQUEADO [<dominio>]: Operações de deploy ou commit estão fora do escopo." >&2
    exit 2
  fi

  # Bloqueia comandos destrutivos sem confirmação explícita
  if echo "$CMD" | grep -qE '(DROP TABLE|DROP DATABASE|DELETE FROM .* WHERE 1|TRUNCATE|rm -rf )'; then
    echo "BLOQUEADO [<dominio>]: Comando destrutivo detectado — requer confirmação explícita." >&2
    echo "Comando: $CMD" >&2
    exit 2
  fi
fi

exit 0
```

### A.4.2 — `post-tool-use.sh` (verifica padrões críticos após editar)

```bash
#!/usr/bin/env bash
# Hook: <dominio>/post-tool-use
# Após editar arquivos do escopo, verifica padrões críticos de segurança/correção.

TOOL="$1"
TARGET="$2"

if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ] || [ "$TOOL" = "MultiEdit" ]; then

  # Exemplo: bloquear secret hardcoded em arquivos do escopo
  if echo "$TARGET" | grep -qE '(<ARQUIVOS_SENSIVEIS_DO_DOMINIO>)'; then
    SECRETS=$(grep -nE "(password|secret|api_key|token)\s*=\s*['\"][^'\"]{8,}" "$TARGET" 2>/dev/null)
    if [ -n "$SECRETS" ]; then
      echo "BLOQUEADO [<dominio>]: Possível segredo hardcoded em $TARGET!" >&2
      echo "$SECRETS" >&2
      exit 2
    fi
    echo "[<dominio>] $TARGET verificado — sem secrets detectados." >&2
  fi

  # Adicione aqui invariantes específicos do domínio
  # (ex.: configuração de conexão, padrão de resposta de API, etc.)
fi

exit 0
```

### A.4.3 — `stop.sh` (verificação final antes de encerrar)

```bash
#!/usr/bin/env bash
# Hook: <dominio>/stop
# Antes de encerrar, valida invariantes do domínio no estado atual do repo.

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

echo "[<dominio>] Verificação final..." >&2

# Exemplo: detectar violação arquitetural que só aparece olhando o repo inteiro
VIOLACAO=$(grep -r "<PADRAO_PROIBIDO>" <PASTA> 2>/dev/null -l)
if [ -n "$VIOLACAO" ]; then
  echo "BLOQUEADO [<dominio>]: <descrição da violação> detectada!" >&2
  echo "Arquivos: $VIOLACAO" >&2
  exit 2
fi

# Avisos não-bloqueantes (ex.: schema mudou mas falta migration)
# echo "AVISO [<dominio>]: ..." >&2

echo "[<dominio>] Verificações OK. Encerrando." >&2
exit 0
```

### A.4.4 — `reviewer/pre-tool-use.sh` (impõe read-only)

```bash
#!/usr/bin/env bash
# Hook: reviewer/pre-tool-use
# O agent reviewer é READ-ONLY. Bloqueia qualquer tentativa de modificar arquivos.

TOOL="$1"

case "$TOOL" in
  Write|Edit|MultiEdit)
    echo "BLOQUEADO: O agent reviewer é somente leitura e não pode modificar arquivos." >&2
    echo "Use Read ou Bash (apenas para rodar build/lint/testes) em vez de $TOOL." >&2
    exit 2
    ;;
  Bash)
    COMMAND="$2"
    if echo "$COMMAND" | grep -qE '(git (add|commit|push|reset|checkout|merge|rebase|branch -[dD])|rm -|mv |cp -|npm install|> [^/])'; then
      echo "BLOQUEADO: O agent reviewer não pode executar comandos que modifiquem o repositório." >&2
      echo "Comandos permitidos: build, lint, testes, cat, grep, ls, git diff, git log, git status." >&2
      exit 2
    fi
    ;;
esac

exit 0
```

> **Nota de portabilidade:** o ExpxBlog usa caminhos absolutos em alguns `stop.sh`. Prefira `git rev-parse --show-toplevel` (como acima) para o documento funcionar em qualquer máquina/projeto.

---

## A.5 — Rules (regras de domínio)

Rules são `.md` carregados como contexto. Há **duas rules de raiz fixas** e **uma rule por agente especializado**.

### A.5.1 — `.claude/rules/seguranca.md` (template)

```markdown
# Segurança — Regras Invioláveis

## Secrets e credenciais
- Nunca leia segredos de onde eles não devem estar; <onde a chave realmente vive>.
- Nunca logue tokens, chaves ou segredos em console, resposta HTTP ou arquivo.
- Nunca exponha headers/identificadores internos em respostas de API.

## Injeção e entrada do usuário
- Todo HTML/entrada do usuário deve ser sanitizado antes de persistir/renderizar.
- Valide entrada na borda do sistema (handler), não dentro das libs.

## Autenticação
- Nunca reimplemente auth onde o middleware/guard já cobre.
- Nunca confie em identificadores vindos do body/query — apenas de fonte confiável.

## Deploy
- Deploy é <mecanismo do projeto> — nunca por comando manual de deploy.
```

### A.5.2 — `.claude/rules/convencoes-gerais.md` (template)

```markdown
# Convenções Gerais

## Autonomia total — nunca delegue ações ao usuário
| Ação | Como executar |
|---|---|
| git add / commit / push | Bash — diretamente após alteração (no fluxo de entrega) |
| build / lint | Bash — para verificar antes de finalizar |
| migrations / SQL | <mecanismo do projeto> — nunca como "passo manual" |

## Nomes e idioma
- Mensagens de erro ao usuário em português.
- Identificadores em inglês; comentários podem ser em português.

## Respostas de API / saída
- Erros no shape padrão do projeto (ex.: `{ error: string }`).
- <demais convenções: status codes, tokens de design, etc.>

## TypeScript / linguagem
- Sem supressão de erro de tipo; corrija o tipo.
- Imports por alias; evite caminhos relativos profundos.
```

### A.5.3 — `.claude/rules/<dominio>/<agente>.md` (template)

```markdown
# <Agente> — Regras de Domínio

## <Invariante 1 do domínio — o que o código não deixa óbvio>
- <regra concreta e verificável>

## <Invariante 2>
- <regra concreta e verificável>

## O que NUNCA fazer neste domínio
- <anti-padrão 1>
- <anti-padrão 2>
```

---

## A.6 — Commands (os 6 fluxos)

Commands viram `/comandos` no Claude Code. São `.md` em `.claude/commands/`. Todos despacham o `orquestrador` e fecham com o `reviewer`/`code-reviewer`.

| Command | Propósito |
|---|---|
| `/implementar` | Implementação ponta-a-ponta: clarificação → plano (Sprints→Fases→Tasks) → execução (TDD quando aplicável) → revisão automática. |
| `/analisar-bug` | Análise profunda de causa-raiz, com relatório estruturado (sem corrigir ainda). |
| `/corrigir-bug` | Correção orquestrada baseada no relatório do `/analisar-bug`. |
| `/melhoria` | Planejamento + implementação de uma melhoria incremental. |
| `/review` | Code review do diff contra rules e CLAUDE.md, com severidades BLOQUEANTE/IMPORTANTE/SUGESTÃO. |
| `/entrega` | Checklist de encerramento: build+lint → verificação de plano → review final → relatório de próximos passos. |

### Template genérico de command `.claude/commands/<nome>.md`

```markdown
# /<nome> — <descrição curta>

<O que este comando faz, em 1–2 frases. Sempre despacha o orquestrador.>

## O que este comando faz

### Fase 1 — <etapa>
<descrição>

### Fase 2 — <etapa>
<descrição>

### Fase N — Revisão
Invoca o `reviewer` (ou `code-reviewer`) sobre o diff produzido antes de concluir.

## Uso

```
/<nome>                 # comportamento padrão
/<nome> <arg>           # variação com argumento
```

---

**Agente**: `orquestrador` → especializados → `reviewer`
**Referências**: `CLAUDE.md`, `.claude/rules/seguranca.md`, `.claude/rules/convencoes-gerais.md`
```

> Os textos integrais dos 6 commands do ExpxBlog servem de referência. Quando o meta-prompt da Parte B gerar os commands no projeto novo, ele deve **manter os nomes e o propósito de cada um**, ajustando apenas os comandos concretos (build/lint/test) e as referências de arquitetura ao stack do projeto-alvo.

---

## A.7 — Skills

Skills são capacidades reutilizáveis. Cada skill é uma pasta com `SKILL.md` (frontmatter `name` + `description` rica em **gatilhos**) e, opcionalmente, `references/`.

### Template `.claude/skills/<skill>/SKILL.md`

```markdown
---
name: <skill-kebab-case>
description: >
  Use when <gatilho 1>, <gatilho 2>. Enforces <o padrão/constraint que a skill
  garante>. Prevents <o erro comum que ela evita>.
---

# Skill: <Título>

## Quando usar
<situações concretas>

## Passos
1. <passo 1>
2. <passo 2>

## Referências
- `references/<arquivo>.md` — <o que contém>
```

> **Boa `description` = boa ativação.** A `description` é o que faz o Claude decidir carregar a skill. Liste gatilhos explícitos ("use when…", "triggers:…") e o erro que a skill previne. Skills sugeridas em todo projeto: uma por "operação repetitiva com armadilha" (ex.: "adicionar página admin", "adicionar endpoint cron", "deploy").

---

# PARTE B — Meta-prompt (cole no projeto-destino)

> Copie tudo dentro do bloco abaixo e cole no Claude Code, na **raiz do projeto novo**. Ele vai auto-analisar o repositório, propor a estrutura, pedir seu OK e gerar tudo.

```text
Você vai recriar neste projeto a MESMA estrutura de governança de agentes do
ExpxBlog: um agente orquestrador primário, um reviewer read-only, agentes
especializados por domínio, rules de domínio, hooks de escopo/segurança, os 6
commands de fluxo e skills. Use o documento docs/blueprint-estrutura-agentes.md
como referência de templates e convenções (se ele existir neste repo, leia-o; caso
contrário, siga exatamente a especificação abaixo).

PRINCÍPIOS UNIVERSAIS (carregue em tudo que gerar):
1. Regra de ouro: nunca peça ao usuário para rodar comandos — todo agente executa
   via ferramenta (git, build, lint, migrations, SQL).
2. O orquestrador nunca escreve código de produto; só coordena.
3. O reviewer é read-only e é sempre o último chamado em tarefas que produzem código.
4. Cada agente especializado tem escopo fechado imposto por hooks (exit 2).
5. Nenhum agente loga secrets.
6. Cada agente especializado tem uma rule de domínio em rules/<dominio>/<agente>.md.
7. Idioma: respostas e erros em português do Brasil; código em inglês.

FASE 1 — AUTO-ANÁLISE (faça antes de qualquer pergunta):
Varra o repositório e descubra:
- Stack e ferramentas: leia package.json / requirements.txt / go.mod / Cargo.toml /
  composer.json etc., e os arquivos de config (next.config, drizzle/prisma, etc.).
- Estrutura de pastas de alto nível e o que cada uma representa.
- Camada de dados (ORM, schema, migrations) se houver.
- Mecanismo de deploy (vercel, docker, CI) e mecanismo de migrations.
- Restrições já documentadas em CLAUDE.md / README / SPEC.md, se existirem.
- Comandos reais de build/lint/test/migrate (scripts do package.json ou equivalente).

FASE 2 — DEDUÇÃO DA ESTRUTURA:
A partir da análise, deduza a lista de agentes ESPECIALIZADOS por domínio (ex.:
db-engineer, api-builder, frontend, payments, cron, etc. — conforme o que o projeto
REALMENTE tem). Para cada agente especializado, determine:
- Pastas/arquivos que ele controla (escopo permitido).
- Pastas que lhe são proibidas (escopo de outros agentes) → vira o regex do hook
  pre-tool-use.
- Invariantes críticos do domínio (viram post-tool-use, stop.sh e a rule).
Sempre inclua os dois agentes FIXOS: orquestrador e reviewer.
Deduza também 1–3 skills úteis (operações repetitivas com armadilha) e ajuste os 6
commands (implementar, analisar-bug, corrigir-bug, melhoria, review, entrega) aos
comandos reais do projeto.

FASE 3 — PROPOSTA E OK:
Apresente ao usuário, de forma resumida:
- A stack detectada.
- A lista de agentes especializados propostos, com escopo de cada um.
- As skills propostas.
- O mecanismo de deploy/migrations detectado (para as rules de segurança e o fluxo
  de entrega).
Peça UM OK explícito (o usuário pode ajustar: remover/adicionar/renomear agentes).
NÃO gere arquivos antes do OK.

FASE 4 — GERAÇÃO (após o OK):
Crie a estrutura completa em .claude/:
- agents/orquestrador.md (com o Mapa de agentes preenchido com os domínios reais).
- agents/reviewer.md (com hook inline reviewer/pre-tool-use).
- agents/<dominio>.md para cada especializado, com frontmatter (name, description,
  model, tools) e os 3 hooks inline (PreToolUse, PostToolUse, Stop).
- hooks/<dominio>/pre-tool-use.sh, post-tool-use.sh, stop.sh para cada especializado
  + hooks/reviewer/pre-tool-use.sh. Use os templates da Parte A.4, preenchendo o
  regex de escopo com as pastas reais. Em stop.sh, use
  `git rev-parse --show-toplevel` em vez de caminho absoluto.
- rules/seguranca.md, rules/convencoes-gerais.md (adaptadas ao deploy/stack reais) e
  rules/<dominio>/<agente>.md para cada especializado.
- commands/implementar.md, analisar-bug.md, corrigir-bug.md, melhoria.md, review.md,
  entrega.md (com os comandos build/lint/test/migrate reais do projeto).
- skills/<skill>/SKILL.md para cada skill deduzida (description rica em gatilhos).
- Se não existir CLAUDE.md, crie um com a regra de ouro + arquitetura + comandos.
  Se existir, NÃO sobrescreva — apenas garanta que a regra de ouro está presente.

Após criar os arquivos, execute: chmod +x .claude/hooks/**/*.sh

FASE 5 — VALIDAÇÃO (execute e reporte):
- Todo agente especializado tem: arquivo .md + 3 hooks + 1 rule de domínio? 
- O orquestrador.md lista todos os agentes no Mapa?
- O reviewer.md tem o hook read-only e está referenciado nos commands?
- Os 6 commands existem?
- Os hooks são executáveis (ls -l) e os caminhos no frontmatter batem com os arquivos?
- Nenhum hook usa caminho absoluto específico de máquina?
Reporte um checklist final com OK/PENDÊNCIA por item e um resumo do que foi criado.
```

---

## Checklist de validação manual (após rodar o meta-prompt)

- [ ] `.claude/agents/orquestrador.md` existe e o Mapa lista todos os especializados.
- [ ] `.claude/agents/reviewer.md` existe, é read-only, e tem o hook `reviewer/pre-tool-use.sh`.
- [ ] Cada agente especializado tem: `agents/<dom>.md` + `hooks/<dom>/{pre,post}-tool-use.sh` + `hooks/<dom>/stop.sh` + `rules/<dom>/<dom>.md`.
- [ ] `rules/seguranca.md` e `rules/convencoes-gerais.md` existem.
- [ ] Os 6 commands existem em `.claude/commands/`.
- [ ] `chmod +x` aplicado a todos os `.sh`.
- [ ] Nenhum hook tem caminho absoluto de máquina (usa `git rev-parse --show-toplevel`).
- [ ] Os `command:` no frontmatter dos agents apontam para hooks que existem.
- [ ] `CLAUDE.md` contém a regra de ouro.

---

## Glossário rápido das peças

| Peça | Onde | O que é |
|---|---|---|
| **Agent** | `.claude/agents/*.md` | Persona com escopo, ferramentas e hooks. Frontmatter + corpo. |
| **Orquestrador** | `.claude/agents/orquestrador.md` | Agente primário; delega e contrata; nunca escreve código. |
| **Reviewer** | `.claude/agents/reviewer.md` | Read-only; QA/segurança; sempre o último. |
| **Rule** | `.claude/rules/**/*.md` | Regras de domínio carregadas como contexto. |
| **Hook** | `.claude/hooks/<dom>/*.sh` | Scripts que impõem escopo/segurança via `exit 2`. |
| **Command** | `.claude/commands/*.md` | Fluxos `/comando` que despacham o orquestrador. |
| **Skill** | `.claude/skills/<s>/SKILL.md` | Capacidade reutilizável ativada por `description` rica em gatilhos. |
