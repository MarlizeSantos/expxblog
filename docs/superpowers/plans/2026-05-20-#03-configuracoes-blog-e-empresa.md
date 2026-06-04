# Configurações do Blog e Dados da Empresa

**Data:** 2026-05-20

## Resumo

Implementação de um sistema de configurações dinâmicas no painel administrativo que permite configurar o nome do blog, descrição, dados da empresa (CNPJ, e-mail, telefone, endereço) e links de redes sociais. Todos os locais onde o nome do blog e dados da empresa estavam fixos (hardcoded) passaram a ler essas informações dinamicamente do banco de dados.

---

## O que foi implementado

### 1. Modelo de dados (`CompanyInfo`)

Adicionada a interface `CompanyInfo` em `lib/settings.ts` com os seguintes campos:

| Campo | Descrição |
|-------|-----------|
| `blog_name` | Nome do blog exibido no header, footer, sidebar admin e título da página |
| `blog_description` | Descrição do blog usada em meta tags SEO |
| `company_name` | Nome legal da empresa (usado no copyright do footer) |
| `company_email` | E-mail de contato |
| `company_phone` | Telefone de contato |
| `company_address` | Endereço completo |
| `company_cnpj` | CNPJ da empresa |
| `social_facebook` | URL do Facebook |
| `social_instagram` | URL do Instagram |
| `social_twitter` | URL do Twitter/X |
| `social_youtube` | URL do YouTube |

### 2. Armazenamento

Os dados são persistidos na tabela `site_settings` (já existente) como um JSON na chave `company_info`. A tabela tem estrutura key-value:

```
key = 'company_info'
value = '{"blog_name":"Meu Blog","company_name":"Empresa Ltda",...}'
```

Não foi necessária nenhuma migration adicional — a tabela já suportava dados arbitrários.

### 3. API

A rota existente `PUT /api/admin/settings` foi expandida para aceitar um campo `company` no body. O comportamento é de merge: os campos enviados são mesclados com os dados já existentes no banco, permitindo atualizações parciais.

### 4. Página de Configurações

Criada a rota `/admin/configuracoes` com formulário organizado em 3 seções:
- **Blog** — Nome e descrição
- **Dados da Empresa** — Nome, CNPJ, e-mail, telefone, endereço
- **Redes Sociais** — Facebook, Instagram, Twitter/X, YouTube

### 5. Consumo dinâmico em toda a aplicação

Todos os componentes que exibiam "MMA Sistemas Blog" ou dados fixos da empresa foram atualizados para ler as configurações do banco via `getSettings()`.

---

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `app/admin/configuracoes/page.tsx` | Server component que carrega as configurações e passa para o client |
| `app/admin/configuracoes/ConfiguracoesClient.tsx` | Formulário client-side com 3 seções (Blog, Empresa, Redes Sociais) |
| `app/admin/login/LoginForm.tsx` | Client component extraído da página de login (para receber props do server) |

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `lib/settings.ts` | Adicionada interface `CompanyInfo`, constante `DEFAULT_COMPANY`, campo `company` no `SiteSettings`, leitura da chave `company_info` no banco |
| `app/api/admin/settings/route.ts` | Adicionado campo `company` no schema Zod e lógica de upsert com merge |
| `app/layout.tsx` | Metadata estático (`export const metadata`) substituído por `generateMetadata()` com nome do blog dinâmico |
| `app/(public)/page.tsx` | Metadata estático substituído por `generateMetadata()` com descrição dinâmica |
| `app/(public)/layout.tsx` | Passa `blogName` e dados da empresa como props para Header, PortalHeader e Footer |
| `components/layout/Header.tsx` | Aceita prop `blogName` em vez de texto fixo |
| `components/layout/PortalHeader.tsx` | Aceita prop `blogName` em vez de texto fixo |
| `components/layout/Footer.tsx` | Aceita props com nome do blog, nome da empresa e redes sociais; exibe links dinamicamente |
| `app/admin/layout.tsx` | Chama `getSettings()` e exibe nome do blog dinâmico na sidebar |
| `app/admin/login/page.tsx` | Convertido em server component wrapper que passa `blogName` para `LoginForm.tsx` |

## Estratégia de fallback

Quando o nome do blog ainda não está configurado no banco, o sistema usa fallback em cascata:

```
company.blog_name → process.env.NEXT_PUBLIC_BLOG_NAME → 'Blog'
```

Isso garante que a aplicação nunca exiba um nome vazio.

---

## Prompt para replicar em outro projeto

O prompt abaixo pode ser usado para aplicar as mesmas funcionalidades em um projeto idêntico que ainda não possua este recurso. Basta colar o prompt na ferramenta de IA e ela criará tudo automaticamente.

---

```markdown
# Prompt: Criar tela de Configurações do Blog com dados dinâmicos da empresa

## Contexto

Tenho um projeto Next.js 14 App Router com TypeScript, Tailwind CSS, Drizzle ORM e PostgreSQL (Supabase). O projeto já possui:

- Tabela `site_settings` no banco com estrutura key-value (`key` text PK, `value` text, `updated_at` timestamp)
- Schema Drizzle em `drizzle/schema.ts` com a tabela `siteSettings` exportada
- Conexão com banco em `drizzle/db.ts` exportando `db`
- Função `getSettings()` em `lib/settings.ts` que já lê `active_template` e `theme_colors` da tabela `site_settings` e retorna um objeto `SiteSettings`
- Interface `ThemeColors` e `SiteSettings` em `lib/settings.ts`
- Rotas admin protegidas por JWT em `app/admin/`
- Layout admin em `app/admin/layout.tsx` com sidebar de navegação
- API route existente em `app/api/admin/settings/route.ts` com GET e PUT
- Componente `Button` em `components/ui/Button.tsx` com variantes primary/secondary/ghost/danger e prop `loading`
- Layout público em `app/(public)/layout.tsx` que renderiza Header, PortalHeader e Footer
- Componentes `components/layout/Header.tsx`, `components/layout/PortalHeader.tsx`, `components/layout/Footer.tsx`
- Página de login admin em `app/admin/login/page.tsx` (client component com 'use client')
- Layout raiz em `app/layout.tsx` com metadata estático

## O que preciso que você faça

### Passo 1: Adicionar interface CompanyInfo e expandir SiteSettings

No arquivo `lib/settings.ts`:

1. Adicionar a interface `CompanyInfo` com os campos:
   - `blog_name: string`
   - `blog_description: string`
   - `company_name: string`
   - `company_email: string`
   - `company_phone: string`
   - `company_address: string`
   - `company_cnpj: string`
   - `social_facebook: string`
   - `social_instagram: string`
   - `social_twitter: string`
   - `social_youtube: string`

2. Adicionar campo `company: CompanyInfo` na interface `SiteSettings`

3. Criar constante `DEFAULT_COMPANY` com todos os campos como strings vazias

4. Na função `getSettings()`, ler a chave `company_info` do banco, parsear como JSON e fazer merge com `DEFAULT_COMPANY`. Retornar no objeto final.

### Passo 2: Atualizar a API de settings

No arquivo `app/api/admin/settings/route.ts`:

1. Adicionar no schema Zod (`putSchema`) um campo opcional `company` com validações:
   - `blog_name`: string max 100, opcional
   - `blog_description`: string max 500, opcional
   - `company_name`: string max 150, opcional
   - `company_email`: email ou string vazia, opcional
   - `company_phone`: string max 30, opcional
   - `company_address`: string max 300, opcional
   - `company_cnpj`: string max 20, opcional
   - `social_facebook`: string max 200, opcional
   - `social_instagram`: string max 200, opcional
   - `social_twitter`: string max 200, opcional
   - `social_youtube`: string max 200, opcional

2. No handler PUT, se `company` estiver presente, fazer merge com os dados atuais (buscar com `getSettings()`, espalhar `current.company` com os dados recebidos), serializar como JSON e salvar na chave `company_info` usando upsert (insert com `onConflictDoUpdate`).

### Passo 3: Criar página de Configurações no admin

Criar diretório `app/admin/configuracoes/` com dois arquivos:

**`page.tsx`** (server component):
```typescript
import { getSettings } from '@/lib/settings'
import { ConfiguracoesClient } from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const settings = await getSettings()
  return <ConfiguracoesClient initial={settings.company} />
}
```

**`ConfiguracoesClient.tsx`** ('use client'):
- Recebe `initial: CompanyInfo` como prop
- Mantém estado local `company` inicializado com `initial`
- Define um array de seções com campos (Blog, Dados da Empresa, Redes Sociais)
- Renderiza formulário com inputs e textareas conforme config
- Ao salvar, envia PUT para `/api/admin/settings` com body `{ company }`
- Exibe toast de sucesso/erro
- Usa componente `Button` existente para o botão de salvar

### Passo 4: Adicionar item no menu lateral do admin

Em `app/admin/layout.tsx`, adicionar no array `navItems`:
```typescript
{ href: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' }
```

### Passo 5: Tornar o nome do blog dinâmico em toda a aplicação

**5a. Layout raiz (`app/layout.tsx`)**:
- Substituir `export const metadata: Metadata = { ... }` por `export async function generateMetadata(): Promise<Metadata>`
- Dentro dela, chamar `getSettings()`, extrair `company.blog_name`
- Usar fallback: `company.blog_name || process.env.NEXT_PUBLIC_BLOG_NAME || 'Blog'`
- Usar o nome dinâmico no `title.template` e `title.default`
- Usar `company.blog_description` como `description`

**5b. Página pública home (`app/(public)/page.tsx`)**:
- Substituir metadata estático por `generateMetadata()`
- Usar nome e descrição do blog dinâmicos

**5c. Componentes Header e PortalHeader**:
- Adicionar prop `blogName: string`
- Substituir texto hardcoded pela prop

**5d. Componente Footer**:
- Adicionar props: `blogName`, `companyName`, `companyEmail`, `companyPhone`, `socialFacebook`, `socialInstagram`, `socialTwitter`, `socialYoutube`
- Exibir nome do blog dinâmico
- Exibir links de redes sociais apenas se preenchidos
- No copyright, usar `companyName || blogName`

**5e. Layout público (`app/(public)/layout.tsx`)**:
- Chamar `getSettings()` para extrair `company`
- Calcular `blogName` com fallback
- Passar `blogName` e dados da empresa como props para Header/PortalHeader/Footer

**5f. Layout admin (`app/admin/layout.tsx`)**:
- Importar e chamar `getSettings()`
- Extrair `company.blog_name` com fallback
- Usar no texto da sidebar em vez do nome fixo

**5g. Página de login (`app/admin/login/page.tsx`)**:
- Separar em dois arquivos:
  - `page.tsx` vira server component que busca settings e passa `blogName` para o client
  - `LoginForm.tsx` vira client component que recebe `blogName` como prop e exibe no título
- O formulário permanece idêntico, apenas o nome exibido passa a ser dinâmico

### Passo 6: Verificação

Após todas as alterações, rodar `npx tsc --noEmit` para garantir que não há erros de tipo.

## Convenções

- Não adicionar comentários no código
- Seguir o estilo de código existente no projeto
- Usar português para labels e mensagens de texto visíveis ao usuário
- Usar inglês para nomes de variáveis, tipos e chaves de API
```
