# 📋 Passo a Passo — Vercel + Supabase (100% grátis)

Siga **na ordem**.

---

## ✅ PASSO 1 — Substituir o projeto atual

Você já tem `C:\Users\Tutts\caixinhas\` com o projeto antigo (Railway/Fastify). Vamos substituir tudo pela nova versão.

### 1.1. Backup (opcional, mas recomendado)

```powershell
cd C:\Users\Tutts
Rename-Item -Path "caixinhas" -NewName "caixinhas-OLD"
```

### 1.2. Extrair o novo ZIP

Baixa o `caixinha-vercel.zip` que vou entregar e:

```powershell
cd C:\Users\Tutts
Expand-Archive -Path "C:\Users\Tutts\Downloads\caixinha-vercel.zip" -DestinationPath "C:\Users\Tutts" -Force
cd C:\Users\Tutts\caixinha
dir
```

**Esperado:** lista com `src`, `prisma`, `public`, `.github`, `package.json`, etc.

---

## ✅ PASSO 2 — Criar conta + projeto Supabase

### 2.1. Criar conta

1. Vai em https://supabase.com
2. **Start your project** → **Sign in with GitHub**
3. ⚠️ **Usa a conta nova** `leoprojetosdev753852-cmyk` (mesma do GitHub)

### 2.2. Criar projeto

1. Click **New project**
2. **Organization:** deixa a default
3. **Name:** `caixinha`
4. **Database Password:** **gera uma forte e SALVA num lugar seguro** (Supabase NÃO mostra de novo)
   - Sugestão: usa um gerador, tipo 20 caracteres aleatórios
5. **Region:** **South America (São Paulo)** — menor latência
6. **Pricing Plan:** Free
7. Click **Create new project**
8. Aguarda ~2 minutos enquanto provisiona

### 2.3. Pegar as Connection Strings

Quando o projeto subir:

1. **Settings** (engrenagem no menu lateral) → **Database**
2. Role até **Connection string**
3. Tem 2 abas: **URI** (para libs comuns) e **Connection pooling** (Recomendada pra Vercel)

Você vai precisar de **DUAS** strings:

**A) DATABASE_URL** (Connection pooling, **Transaction mode**, porta 6543):

Marca a aba **Transaction**. Copia algo tipo:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

Substitui `[YOUR-PASSWORD]` pela senha que você gerou no 2.2 step 4.

**Adiciona no final:** `?pgbouncer=true&connection_limit=1`

Resultado final fica:
```
postgresql://postgres.xxxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**B) DIRECT_URL** (Direct connection, porta 5432):

Aba **Session** ou **Direct connection**. Copia algo tipo:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

Substitui `[YOUR-PASSWORD]` pela mesma senha.

**Salva as duas strings num bloco de notas** — vamos usar várias vezes.

---

## ✅ PASSO 3 — Configurar .env local

Na pasta do projeto:

```powershell
cd C:\Users\Tutts\caixinha
Copy-Item .env.example .env
notepad .env
```

No Notepad, preenche:

```env
DATABASE_URL="postgresql://postgres.xxxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

JWT_ACCESS_SECRET="GERA_AGORA_COM_POWERSHELL"
JWT_REFRESH_SECRET="GERA_OUTRO_DIFERENTE"
CRON_SECRET="GERA_OUTRO_TAMBEM"

ADMIN_INITIAL_NAME="Seu Nome"
ADMIN_INITIAL_CPF="SEU_CPF_SO_NUMEROS"
ADMIN_INITIAL_PASSWORD="UmaSenhaForte123"
```

### 3.1. Gerar os 3 secrets

Roda 3 vezes no PowerShell:

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

Cada execução gera 64 chars. Cola em:
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- CRON_SECRET

Salva o .env.

---

## ✅ PASSO 4 — Instalar dependências e migrar banco

```powershell
cd C:\Users\Tutts\caixinha

# Instala tudo (vai demorar uns 2 min)
npm install

# Gera Prisma Client
npx prisma generate

# Cria as tabelas no Supabase
npx prisma migrate dev --name init
```

**Esperado:**
```
✔ Generated Prisma Client
The following migration(s) have been created and applied:
20260523_init/
  └─ migration.sql
```

### 4.1. Criar o admin

```powershell
npm run db:seed
```

**Esperado:**
```
✅ Admin criado com sucesso:
   ID: clxxxxxxx
   Nome: Seu Nome
   CPF: 12345678900
```

### 4.2. Testar local

```powershell
npm run dev
```

Abre http://localhost:3000

- Deve redirecionar pro `/login`
- Entra com CPF + senha do admin que cadastrou
- Deve cair no `/dashboard`

Se chegou aqui, **localmente está 100%**. Mata o servidor (Ctrl+C) e vamos pro deploy.

---

## ✅ PASSO 5 — Subir código pro GitHub

```powershell
cd C:\Users\Tutts\caixinha

git init
git add .
git commit -m "feat: setup completo Vercel + Supabase"
git branch -M main

# ⚠️ Como você está numa conta nova do GitHub, vai criar repo NOVO
# Antes, vai em https://github.com/new e cria repo "caixinha" (singular, sem 's')
# Depois:

git remote add origin https://github.com/leoprojetosdev753852-cmyk/caixinha.git
git push -u origin main
```

⚠️ Se você ainda tem o repo `Caixinha` (com `C` maiúsculo) e quer reusar, **substitui o nome** no comando acima.

---

## ✅ PASSO 6 — Deploy Vercel

### 6.1. Criar conta Vercel

1. Vai em https://vercel.com
2. **Sign Up** → **Continue with GitHub**
3. ⚠️ Logando com a conta nova GitHub (`leoprojetosdev753852-cmyk`)

### 6.2. Importar projeto

1. Na home da Vercel, click **Add New...** → **Project**
2. **Import Git Repository** → procura `caixinha` → click **Import**
3. Vercel detecta Next.js automaticamente

### 6.3. Configurar variáveis de ambiente

Antes do **Deploy**, expande **Environment Variables** e cola:

```env
DATABASE_URL=postgresql://postgres.xxxxx:SENHA@...6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.xxxxx:SENHA@...5432/postgres
JWT_ACCESS_SECRET=mesmo_que_local
JWT_REFRESH_SECRET=mesmo_que_local
CRON_SECRET=mesmo_que_local
```

⚠️ **NÃO** precisa colocar `ADMIN_INITIAL_*` na Vercel (só é usado no seed, que já rodou local).

### 6.4. Click Deploy

Aguarda 2-3 min. Quando terminar, Vercel mostra:

```
🎉 Your project is live at https://caixinha-xxxx.vercel.app
```

### 6.5. Testar produção

Abre a URL. Login com mesmo CPF/senha do admin → cai no dashboard.

---

## ✅ PASSO 7 — Configurar cron no GitHub Actions

O worker (que calcula atrasos diariamente) agora roda como GitHub Actions.

### 7.1. Adicionar secrets no GitHub

1. Vai em `https://github.com/leoprojetosdev753852-cmyk/caixinha/settings/secrets/actions`
2. Click **New repository secret** → cria 2:

| Nome | Valor |
|---|---|
| `APP_URL` | `https://caixinha-xxxx.vercel.app` (URL da Vercel sem barra no final) |
| `CRON_SECRET` | Mesmo valor que está no .env e na Vercel |

### 7.2. Testar manualmente

1. Vai em `https://github.com/leoprojetosdev753852-cmyk/caixinha/actions`
2. Click no workflow **Cron - Calcular Atrasos**
3. Click **Run workflow** → **Run workflow** (verde)
4. Aguarda 30s, recarrega a página
5. Deve aparecer ✅ com status verde

A partir daqui, ele roda automaticamente todo dia às 00h Brasília.

---

## 🎉 Pronto! Tudo em produção, $0/mês

### URLs do seu sistema

- **App em produção:** `https://caixinha-xxxx.vercel.app`
- **Banco (UI visual):** Supabase → Table Editor
- **Logs:** Vercel → seu projeto → Deployments → click no deployment → Functions tab
- **Cron history:** GitHub Actions

### Workflow de desenvolvimento

```powershell
cd C:\Users\Tutts\caixinha
git checkout -b feature/lista-usuarios

# ... codar ...

# Testar local
npm run dev

# Subir
git add .
git commit -m "feat: tela de listagem de usuários"
git push origin feature/lista-usuarios

# Abre PR no GitHub → CI roda
# Merge na main → Vercel deployа automaticamente
```

---

## 🚨 Troubleshooting

| Sintoma | Solução |
|---|---|
| `npm install` falha | Apaga `node_modules` e `package-lock.json`, roda de novo |
| `prisma migrate` dá erro de conexão | Confere DATABASE_URL e DIRECT_URL — senha correta? Região correta? |
| Build na Vercel falha em "prisma generate" | A variável `DATABASE_URL` está definida na Vercel? |
| Login retorna 500 | Vercel → Logs → ver erro real. Geralmente é env var faltando |
| "JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres" | Cada secret precisa ter 64 chars hex (32 bytes) |
| Cookie não persiste no login | Em produção HTTPS é automático. Em local, OK não persistir entre abas |

---

## 📋 Próximos passos (Fase 1)

Quando estiver tudo no ar e o login funcionar, me avisa. Aí partimos pra:

- CRUD admin de usuários (cadastro prévio)
- Tela admin lista usuários + dados PIX
- Middleware de proteção de rota por role
- Tela "Editar perfil"
