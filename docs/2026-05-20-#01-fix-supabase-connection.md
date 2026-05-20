# Fix: Conexão com Supabase não funcionava localmente

**Data:** 2026-05-20  
**Autor:** Miguel Viana  

---

## Problema

O blog rodava localmente (`npm run dev`) mas não exibia os artigos. A página carregava em branco, sem posts. O console do browser apresentava erro 404 para alguns recursos.

## Diagnóstico

### 1. API retornando 500

```
GET http://localhost:3000/api/posts → {"error":"Erro interno do servidor"}
```

### 2. Teste de conexão direta

```
ERRO: Tenant or user not found
```

O erro `Tenant or user not found` é retornado pelo pgBouncer do Supabase quando o projeto está **pausado**. No plano gratuito, projetos são pausados automaticamente após 1 semana de inatividade.

### 3. Conexão direta (porta 5432) também falhou

```
ERRO: getaddrinfo ENOTFOUND db.slgcidynzxlallmvgzid.supabase.co
```

A conexão direta não é compatível com redes IPv4 sem o add-on pago.

## Causa raiz

Dois problemas combinados:

1. **Projeto Supabase pausado** — reativado manualmente pelo usuário no dashboard.
2. **URL de conexão errada** — o `.env` usava o **Transaction Pooler** (`aws-0`, porta 6543), que estava com problema. O correto para redes IPv4 é o **Session Pooler** (`aws-1`, porta 5432).

## Solução

### `.env` — atualizado `DATABASE_URL`

```diff
- DATABASE_URL=postgresql://postgres.slgcidynzxlallmvgzid:gtiaeinovacao@aws-0-us-east-1.pooler.supabase.com:6543/postgres
+ DATABASE_URL=postgresql://postgres.slgcidynzxlallmvgzid:gtiaeinovacao@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

### `drizzle/db.ts` — removido `prepare: false`, aumentado pool

```diff
  const client = postgres(process.env.DATABASE_URL!, {
    ssl: 'require',
-   max: 1,
-   prepare: false,
+   max: 10,
  })
```

- `prepare: false` era necessário apenas para o Transaction Pooler (pgBouncer não suporta prepared statements). O Session Pooler não tem essa restrição.
- `max: 1` foi aumentado para `10` para comportar concorrência em produção.

## Verificação

Após as mudanças, a API respondeu corretamente:

```
GET /api/posts → 200 OK | 4 posts retornados
```

## Configuração na Vercel

Para produção, as seguintes variáveis de ambiente devem estar configuradas em **Settings → Environment Variables**:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://postgres.slgcidynzxlallmvgzid:****@aws-1-us-east-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | string aleatória de 32+ caracteres |
| `NEXT_PUBLIC_APP_URL` | URL do domínio na Vercel |
| `NEXT_PUBLIC_BLOG_NAME` | `MMA Sistemas Blog` |

Gerar um `JWT_SECRET` seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Prevenção futura

- **Plano gratuito do Supabase pausa projetos após 7 dias sem requisições.** Para evitar pausas, acesse o dashboard periodicamente ou faça upgrade para o plano Pro.
- Sempre usar o **Session Pooler** em ambientes IPv4 (Vercel, maioria dos provedores cloud).
