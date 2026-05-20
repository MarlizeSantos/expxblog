# Migração de Imagens: Filesystem Local → Supabase Storage

**Data:** 2026-05-20  
**Autor:** Miguel Viana  

---

## Problema

As imagens dos posts eram salvas em `public/uploads/` no servidor local. Isso causava dois problemas:

1. **Deploy/repositório quebrado** — a pasta `public/uploads/` está no `.gitignore`, então as imagens não vão para o git e somem a cada novo deploy na Vercel.
2. **Estado inconsistente** — se o servidor reiniciar ou o deploy acontecer, todas as imagens de capa dos posts deixam de aparecer.

## Solução

Substituir o armazenamento local pelo **Supabase Storage** (bucket público `uploads`). As imagens passam a ter URLs absolutas persistentes, independentes do servidor:

```
https://slgcidynzxlallmvgzid.supabase.co/storage/v1/object/public/uploads/<filename>
```

---

## O que foi feito

### 1. Instalação do pacote

```bash
npm install @supabase/supabase-js
```

### 2. Variáveis de ambiente adicionadas ao `.env`

```env
NEXT_PUBLIC_SUPABASE_URL=https://slgcidynzxlallmvgzid.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key do Supabase Dashboard>
```

Encontre a `SUPABASE_SERVICE_ROLE_KEY` em: **Supabase Dashboard → Project Settings → API → service_role**.

### 3. Novo arquivo: `lib/supabase-admin.ts`

Cliente Supabase server-side com a chave de serviço. Usado nas API routes do Next.js para operações de storage.

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export const STORAGE_BUCKET = 'uploads'
```

### 4. API de upload atualizada: `app/api/admin/upload/route.ts`

**Antes** (filesystem local):
```typescript
await mkdir(uploadDir, { recursive: true })
await writeFile(path.join(uploadDir, filename), Buffer.from(bytes))
return NextResponse.json({ url: `/uploads/${filename}` })
```

**Depois** (Supabase Storage):
```typescript
await supabaseAdmin.storage
  .from(STORAGE_BUCKET)
  .upload(filename, Buffer.from(bytes), { contentType: file.type })

const { data: { publicUrl } } = supabaseAdmin.storage
  .from(STORAGE_BUCKET)
  .getPublicUrl(filename)

return NextResponse.json({ url: publicUrl })
```

### 5. Script de migração: `scripts/migrate-images.ts`

Script de uso único que:
1. Cria o bucket `uploads` no Supabase Storage (se não existir)
2. Faz upload dos arquivos locais em `public/uploads/`
3. Atualiza o campo `cover_image` em todos os posts no banco
4. Remove os arquivos locais

```bash
npm run migrate:images
```

Saída da execução:
```
✔ Bucket criado: uploads

Migrando 4 arquivo(s)...
✔ 1778101889588-3pkokef6bx9.png
✔ diesel-margem-empresa-2026-cover.jpg
✔ nfs-e-nacional-2026-simples-nacional-cover.jpg
✔ reforma-tributaria-2026-distribuidoras-erp-cover.png

Atualizando posts no banco...
✔ Post 1: /uploads/... → https://slgcidynzxlallmvgzid.supabase.co/...
✔ Post 2: /uploads/... → https://slgcidynzxlallmvgzid.supabase.co/...
✔ Post 3: /uploads/... → https://slgcidynzxlallmvgzid.supabase.co/...
✔ Post 4: /uploads/... → https://slgcidynzxlallmvgzid.supabase.co/...

4 post(s) atualizado(s).

Removendo arquivos locais...
✔ Removido: diesel-margem-empresa-2026-cover.jpg
(...)

Migração concluída!
```

### 6. `next.config.js` — sem alteração necessária

O hostname `**.supabase.co` já estava nas `remotePatterns`, então as imagens são exibidas corretamente sem nenhuma mudança na camada de exibição.

---

## Variáveis de ambiente na Vercel

Adicionar em **Settings → Environment Variables**:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://slgcidynzxlallmvgzid.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (do Supabase Dashboard) |

---

## Arquivos alterados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `lib/supabase-admin.ts` | Novo | Cliente Supabase server-side |
| `app/api/admin/upload/route.ts` | Alterado | Upload via Supabase Storage |
| `scripts/migrate-images.ts` | Novo | Script de migração única |
| `.env.example` | Alterado | Novas variáveis documentadas |
| `package.json` | Alterado | Nova dependência + script `migrate:images` |

---

## Prompt para reimplementar no Claude Code

Caso precise aplicar essa mesma migração em uma versão do projeto que ainda usa o filesystem local, cole o prompt abaixo em uma nova conversa no Claude Code:

---

```
Preciso migrar o armazenamento de imagens deste projeto Next.js de
arquivos locais (public/uploads/) para o Supabase Storage.

Contexto do projeto:
- Stack: Next.js 14 App Router, TypeScript, Drizzle ORM, PostgreSQL (Supabase)
- As imagens são salvas em `public/uploads/` via `fs.writeFile` na rota
  `app/api/admin/upload/route.ts`
- A URL retornada é `/uploads/<filename>` (caminho relativo local)
- Os posts têm um campo `cover_image` (text) no banco com essas URLs locais
- O `next.config.js` já tem `**.supabase.co` nas `remotePatterns`

O que precisa ser feito:
1. Instalar `@supabase/supabase-js`
2. Criar `lib/supabase-admin.ts` com o cliente server-side usando
   `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
3. Atualizar `app/api/admin/upload/route.ts` para usar
   `supabaseAdmin.storage.from('uploads').upload(...)` em vez de `fs.writeFile`,
   e retornar a `publicUrl` do Supabase
4. Criar `scripts/migrate-images.ts` que:
   a. Cria o bucket `uploads` (público) no Supabase Storage se não existir
   b. Lê todos os arquivos em `public/uploads/` (exceto `.gitkeep`)
   c. Faz upload de cada um para o bucket
   d. Atualiza o campo `cover_image` nos posts no banco (Drizzle) com as
      novas URLs absolutas do Supabase
   e. Remove os arquivos locais após migração bem-sucedida
5. Adicionar `"migrate:images": "tsx scripts/migrate-images.ts"` ao package.json
6. Atualizar `.env.example` com as novas variáveis
7. Adicionar ao `.env` local:
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<chave do Supabase Dashboard → Project Settings → API>
8. Rodar `npm run migrate:images`
9. Commitar e fazer push para o GitHub (o Vercel faz deploy automático)

Não esqueça de também adicionar as variáveis `NEXT_PUBLIC_SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente da Vercel.
```

---
