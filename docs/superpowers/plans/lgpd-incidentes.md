# Runbook de Resposta a Incidentes de Segurança / Privacidade

**Versão:** 1.0 — 2026-06-04
**Encarregado (DPO):** configurado em `/admin/configuracoes` → campo `company_email`
**Base legal:** Art. 48 LGPD; Resolução CD/ANPD nº 15/2024 (Regulamento de Comunicação de Incidentes)

---

## 1. Detecção e Classificação

### O que conta como incidente

Um incidente de segurança/privacidade é qualquer evento confirmado ou fortemente suspeito que:

- Resulte em acesso não autorizado a dados pessoais (banco Supabase, logs, e-mails de newsletter)
- Cause destruição, alteração, perda ou divulgação acidental de dados pessoais
- Comprometa credenciais de acesso ao sistema (JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY, api_tokens, chave OpenRouter)
- Exponha dados de titulares (assinantes, visitantes, administradores) a terceiros não autorizados

### Escala de severidade

| Nível | Critério | Prazo de resposta inicial |
|---|---|---|
| **CRÍTICO** | Acesso confirmado a tabelas com dados pessoais (users, newsletter_subscribers, page_views); credenciais principais comprometidas | Imediato — iniciar contenção em até 1 hora |
| **ALTO** | Suspeita fundamentada de acesso não autorizado; vazamento de logs internos (automation_logs, ai_request_logs) | Até 4 horas |
| **MÉDIO** | Tentativa de acesso bloqueada; rate-limit de login disparado massivamente; anomalia em logs | Até 24 horas |
| **BAIXO** | Eventos de segurança sem evidência de comprometimento de dados | Registro e monitoramento |

---

## 2. Contenção

Executar imediatamente após confirmação de comprometimento:

### 2.1 Rotacionar segredos comprometidos

```bash
# JWT_SECRET — invalida todos os tokens de sessão ativos
# Gere novo valor: openssl rand -base64 32
# Atualize no Vercel: Dashboard → Project → Settings → Environment Variables → JWT_SECRET
# Faça redeploy após a atualização para aplicar o novo valor

# SUPABASE_SERVICE_ROLE_KEY — invalida acessos administrativos via API
# Rotacione em: Supabase Dashboard → Project Settings → API → Service Role Key
# Atualize no Vercel e faça redeploy

# ANALYTICS_SALT — invalida todos os fingerprints históricos
# Gere novo valor: openssl rand -base64 32
# Atualize no Vercel e faça redeploy

# Chave OpenRouter (ai_api_key)
# Revogue em: https://openrouter.ai/keys
# Atualize no painel admin: /admin/configuracoes → seção IA
```

### 2.2 Revogar api_tokens comprometidos

```sql
-- Execute via Supabase Dashboard → SQL Editor ou via MCP execute_sql
-- Revogar token específico:
UPDATE api_tokens SET revoked = true, revoked_at = now()
WHERE token = '[TOKEN_COMPROMETIDO]';

-- Revogar todos os tokens ativos (cenário de comprometimento geral):
UPDATE api_tokens SET revoked = true, revoked_at = now()
WHERE revoked = false;
```

### 2.3 Verificar acessos suspeitos nos logs

```sql
-- Últimas inserções em newsletter (acesso não autorizado a e-mails?):
SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 50;

-- Últimos logins de admin:
SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT 100;

-- Pageviews anômalos (scraping massivo?):
SELECT path, COUNT(*) as total FROM page_views
WHERE visited_at > now() - INTERVAL '1 hour'
GROUP BY path ORDER BY total DESC LIMIT 20;
```

### 2.4 Bloquear acesso temporário se necessário

- Suspender o deploy no Vercel (Dashboard → Deployments → opção de suspensão)
- Ou colocar página de manutenção redirecionando todo tráfego

---

## 3. Avaliação de Risco aos Titulares

Após contenção, avaliar:

| Questão | Orientação |
|---|---|
| Quais dados foram expostos? | Identificar tabelas/campos acessados: e-mails (newsletter_subscribers), IPs pseudonimizados (page_views), senhas hash (users), logs operacionais |
| Quantos titulares afetados? | Contar registros na janela de tempo do incidente |
| Há risco de dano concreto? | E-mails expostos: alto (spam, phishing). Senhas hash bcrypt: baixo se hash forte. IPs truncados/hash: muito baixo (não identificáveis individualmente). Logs IA: baixo (sem dados pessoais de visitantes). |
| A notificação é obrigatória? | Sim, se houver risco ou dano relevante aos titulares (Art. 48 LGPD) |

---

## 4. Notificação à ANPD

**Prazo:** A Resolução CD/ANPD nº 15/2024 recomenda comunicação à ANPD em até **3 dias úteis** após a ciência do incidente de segurança que possa acarretar risco ou dano relevante aos titulares.

**Canal:** Portal de Peticionamento da ANPD — [gov.br/anpd](https://www.gov.br/anpd)

**Conteúdo mínimo da comunicação (Art. 48 §1 LGPD + Resolução nº 15/2024):**

1. **Descrição da natureza dos dados afetados** — quais categorias e volume estimado de registros
2. **Informações sobre os titulares envolvidos** — perfil (assinantes, visitantes, administradores) e número aproximado
3. **Indicação das medidas técnicas e de segurança utilizadas** — bcrypt, TLS, hash de IPs, rotação de segredos
4. **Riscos relacionados ao incidente** — potencial de dano concreto a titulares
5. **Motivos da demora** (se notificação vier após 3 dias úteis) — justificativa documentada
6. **Medidas que foram ou que serão adotadas** — ações de contenção já executadas e plano de prevenção
7. **Encarregado de Dados** — nome e contato

---

## 5. Notificação aos Titulares Afetados

**Quando notificar:** quando o incidente puder causar risco ou dano relevante ao titular (Art. 48 §1 LGPD).

**Canal preferencial:**
- Assinantes de newsletter: e-mail direto para os endereços expostos
- Usuários administradores: e-mail direto para o endereço cadastrado

**Conteúdo mínimo da notificação ao titular:**

```
Assunto: Aviso de Incidente de Segurança — [Nome do Blog]

Prezado(a) [Nome/Assinante],

Identificamos um incidente de segurança em [DATA] que pode ter afetado
seus dados pessoais em nossa plataforma.

Dados possivelmente afetados: [descrever brevemente, ex: endereço de e-mail]

Medidas tomadas: [descrever ações de contenção já executadas]

O que você pode fazer: [orientações práticas, ex: atenção a e-mails
suspeitos, não clicar em links desconhecidos]

Para exercer seus direitos de titular (acesso, exclusão, portabilidade)
ou para mais informações, entre em contato pelo e-mail: [company_email]

Atenciosamente,
[Nome do Controlador]
[company_email]
```

---

## 6. Registro e Pós-Incidente

### 6.1 Registro obrigatório

Documentar em arquivo interno (não público) contendo:

- Data/hora de detecção e de ciência interna
- Timeline completa do incidente (detecção → contenção → notificações)
- Dados afetados (tabelas, campos, volume estimado)
- Ações de contenção executadas com timestamps
- Número de protocolo da notificação à ANPD (se aplicável)
- Comunicações enviadas a titulares

Os logs de sistema disponíveis para auxiliar na investigação:
- `automation_logs` — histórico de execuções automatizadas
- `ai_request_logs` — requisições ao pipeline de IA
- Logs do Supabase (Dashboard → Logs) — acessos ao banco de dados
- Logs do Vercel (Dashboard → Functions Logs) — requisições às APIs

### 6.2 Lições aprendidas (pós-mortem)

Conduzir reunião de pós-mortem em até 7 dias após resolução do incidente com:

1. **Causa raiz** — o que permitiu o incidente ocorrer?
2. **Detecção** — foi detectado em tempo hábil? O que poderia melhorar a detecção?
3. **Resposta** — o runbook funcionou? Alguma etapa foi confusa ou ineficiente?
4. **Prevenção** — quais controles técnicos ou processuais evitariam reincidência?
5. **Atualizações** — este runbook precisa ser revisado com base no ocorrido?

Resultado do pós-mortem deve ser documentado e as melhorias priorizadas no backlog.

---

## Referências

- Lei Geral de Proteção de Dados — Lei nº 13.709/2018 (Art. 48)
- Resolução CD/ANPD nº 15/2024 — Regulamento de Comunicação de Incidentes de Segurança
- Política de Privacidade pública: `/politica-de-privacidade`
- ROPA (Registro de Atividades de Tratamento): `docs/lgpd-ropa.md`
