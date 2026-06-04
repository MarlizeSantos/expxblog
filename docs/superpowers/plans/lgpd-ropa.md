# Registro de Atividades de Tratamento (ROPA)

**Última revisão:** 2026-06-04
**Responsável:** Encarregado de Dados (DPO) — contato via e-mail configurado em `/admin/configuracoes` (campo `company_email`).
**Referência pública:** Política de Privacidade disponível em `/politica-de-privacidade`.

> Este documento deve ser revisado sempre que houver nova operação de tratamento, alteração de subprocessador ou mudança de finalidade. Recomenda-se revisão periódica mínima anual.

---

## 1. Newsletter

| Campo | Detalhe |
|---|---|
| **Dados tratados** | Endereço de e-mail; nome (opcional) |
| **Titulares** | Visitantes do blog que realizam inscrição voluntária |
| **Finalidade** | Envio de comunicações sobre novos artigos publicados e conteúdos relacionados |
| **Base legal** | Art. 7º, I — Consentimento explícito do titular no formulário de inscrição |
| **Retenção** | Enquanto a inscrição estiver ativa; 30 dias após cancelamento (para processamento de remoção e logs de desinscrição) |
| **Subprocessadores / transferência internacional** | **Resend Inc.** (EUA) — serviço de envio de e-mails transacionais. Transferência internacional coberta pelas cláusulas contratuais padrão (SCC) e Privacy Shield successor framework. |
| **Registro no sistema** | Tabela `newsletter_subscribers` (Supabase / PostgreSQL) |

---

## 2. Analytics de Pageviews

| Campo | Detalhe |
|---|---|
| **Dados tratados** | IP truncado e anonimizado via SHA-256 com salt diário dedicado (nunca armazenado em texto claro); User-Agent do navegador; URL da página visitada; URL de referência (Referer) |
| **Titulares** | Visitantes públicos do blog |
| **Finalidade** | Mensuração de audiência, identificação de conteúdo popular e prevenção de contagem duplicada de visitas (deduplicação de 5 minutos) |
| **Base legal** | Art. 7º, IX — Legítimo interesse do controlador (melhoria do serviço, planejamento editorial). O IP é truncado no último octeto (/24 IPv4, /64 IPv6) antes do hash, tornando o dado pseudonimizado sem capacidade de reconstrução do host individual. |
| **Retenção** | 12 meses a partir da data do pageview |
| **Subprocessadores / transferência internacional** | **Supabase Inc.** (EUA) — infraestrutura de banco de dados PostgreSQL gerenciada. Dados em repouso criptografados. Transferência coberta por DPA com cláusulas contratuais padrão. |
| **Registro no sistema** | Tabela `page_views` (Supabase / PostgreSQL) |

---

## 3. Usuários Administradores

| Campo | Detalhe |
|---|---|
| **Dados tratados** | Endereço de e-mail; nome; hash bcrypt da senha; data de criação e atualização |
| **Titulares** | Funcionários ou colaboradores com acesso ao painel administrativo |
| **Finalidade** | Autenticação e controle de acesso ao painel de gerenciamento do blog |
| **Base legal** | Art. 7º, II — Execução de contrato ou procedimentos preliminares (relação de trabalho/prestação de serviços); subsidiariamente Art. 7º, IX — Legítimo interesse |
| **Retenção** | Enquanto a conta estiver ativa; após desativação, mantido por prazo mínimo legal (5 anos) para fins de auditoria |
| **Subprocessadores / transferência internacional** | **Supabase Inc.** (EUA) — mesmas condições acima |
| **Registro no sistema** | Tabela `users` (Supabase / PostgreSQL) |

---

## 4. Logs de Automação e de Requisições de IA

| Campo | Detalhe |
|---|---|
| **Dados tratados** | Metadados de execução de pipeline de IA (timestamps, status, duração, IDs de posts gerados, mensagens de erro sem dados pessoais de visitantes); prompts e respostas de modelos de linguagem utilizados na geração de conteúdo editorial |
| **Titulares** | Não há dados de titulares externos identificados nestes logs; os logs são operacionais internos |
| **Finalidade** | Monitoramento operacional, diagnóstico de falhas, auditoria de uso de IA para geração de conteúdo, conformidade com obrigações legais (Art. 48 LGPD — rastreabilidade de incidentes) |
| **Base legal** | Art. 7º, IX — Legítimo interesse operacional do controlador |
| **Retenção** | 6 meses a partir da data de geração do log |
| **Subprocessadores / transferência internacional** | **Supabase Inc.** (EUA) — armazenamento dos logs de automação (tabela `automation_logs`). **OpenRouter Inc.** (EUA) — roteamento de requisições para modelos de linguagem de terceiros; os prompts enviados transitam pelos servidores da OpenRouter. Ver política de privacidade da OpenRouter. |
| **Registro no sistema** | Tabelas `automation_logs`, `ai_request_logs` (Supabase / PostgreSQL) |

---

## 5. Bot Telegram

| Campo | Detalhe |
|---|---|
| **Dados tratados** | `chat_id` e `username` do Telegram — recebidos na requisição para autorização, **não persistidos** em banco de dados |
| **Titulares** | Operadores autorizados que utilizam o bot para acionar geração de artigos |
| **Finalidade** | Verificação de autorização do remetente antes de acionar o pipeline de geração de conteúdo |
| **Base legal** | Art. 7º, IX — Legítimo interesse (controle de acesso operacional) |
| **Retenção** | Não há retenção — dados processados em memória durante a requisição e descartados |
| **Subprocessadores / transferência internacional** | **Telegram Messenger Inc.** (EUA/Dubai) — plataforma de mensagens via qual os dados chegam ao webhook. Não há transferência adicional por parte deste sistema. |

---

## Notas Gerais

- **Controlador:** identificado nas configurações do blog (`company_name`, `company_email` em `/admin/configuracoes`).
- **Encarregado (DPO):** contato disponível na Política de Privacidade em `/politica-de-privacidade`.
- **Segurança técnica:** dados em trânsito protegidos por TLS 1.2+; dados em repouso criptografados pelo Supabase; senhas armazenadas exclusivamente como hash bcrypt; IPs nunca armazenados em texto claro.
- **Direitos dos titulares:** acesso, correção, exclusão, portabilidade e revogação de consentimento podem ser exercidos pelo canal de contato do Encarregado.
