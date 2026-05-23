# 📋 Passo a Passo — Do zero ao deploy

Siga **na ordem**. Cada passo tem comando exato + o que esperar de resposta.

---

## ✅ PASSO 1 — Verificar ferramentas (5 min)

Abre o PowerShell e roda:

```powershell
node --version
```

**Esperado:** `v20.x.x` ou maior. Se não, baixa em https://nodejs.org/ (LTS).

```powershell
git --version
```

**Esperado:** algo tipo `git version 2.x`. Já deve ter, mas se faltar: https://git-scm.com/

```powershell
npm install -g pnpm@8.15.0
pnpm --version
```

**Esperado:** `8.15.0`

---

## ✅ PASSO 2 — Descompactar o projeto (2 min)

1. Baixa o `caixinhas-fase0-final.zip` (que vou entregar no final desta mensagem)
2. Descompacta em `C:\Users\Tutts\`
3. A pasta resultante deve ser `C:\Users\Tutts\caixinhas-final\`
4. Renomeia pra ficar limpo:

```powershell
cd C:\Users\Tutts
Rename-Item -Path "caixinhas-final" -NewName "caixinhas"
cd caixinhas
dir
```

**Esperado:** lista com `apps`, `packages`, `.github`, `package.json`, `README.md`, etc.

---

## ✅ PASSO 3 — Criar repositório no GitHub (5 min)

### 3.1. Iniciar git local

```powershell
cd C:\Users\Tutts\caixinhas

git init
git add .
git commit -m "feat: setup inicial Fase 0 (auth + estrutura monorepo)"
git branch -M main
```

**Esperado:** "X files changed" no commit.

### 3.2. Criar o repo no GitHub

1. Vai em https://github.com/new
2. **Repository name:** `caixinhas`
3. **Private**
4. **NÃO** marca "Initialize with README"
5. Click **Create repository**

### 3.3. Conectar e enviar

Na tela seguinte do GitHub, copia o bloco "**push an existing repository**" e cola no PowerShell. Vai ser algo assim:

```powershell
git remote add origin https://github.com/Leonardodevcloud/caixinhas.git
git push -u origin main
```

**Esperado:** "Branch 'main' set up to track remote..."

Confere que apareceu: https://github.com/Leonardodevcloud/caixinhas

---

## ✅ PASSO 4 — Criar projeto no Railway (5 min)

1. Acessa https://railway.app
2. **Login with GitHub** → autoriza acesso
3. Na home: **New Project** → **Deploy from GitHub repo**
4. Autoriza o Railway a ver `caixinhas`
5. Seleciona o repo `caixinhas`

⚠️ Railway vai tentar buildar e **vai falhar** (não tem env vars ainda). Tudo bem, vamos configurar.

---

## ✅ PASSO 5 — Adicionar PostgreSQL (3 min)

Dentro do projeto que acabou de criar:

1. Click **+ New** (canto superior direito) → **Database** → **Add PostgreSQL**
2. Aguarda 30s o Postgres subir
3. Click no card do **Postgres** → aba **Variables**
4. Confere que tem `DATABASE_URL` (vamos referenciar mais tarde)

✅ Banco pronto.

---

## ✅ PASSO 6 — Configurar serviço API (10 min)

Click no card do serviço que veio do GitHub (deve estar com nome do repo).

### 6.1. Renomear pra "api"

**Settings** → role até **Service** → **Service Name** → muda pra `api` → **Update**

### 6.2. Build Command e Start Command

Ainda em **Settings**:

| Campo | Valor |
|---|---|
| **Root Directory** | (deixa vazio) |
| **Build Command** | `pnpm install --frozen-lockfile && pnpm --filter @caixinhas/database generate && pnpm --filter @caixinhas/api build` |
| **Start Command** | `node apps/api/dist/server.js` |
| **Watch Paths** | `apps/api/**` `packages/**` |

### 6.3. Variáveis de ambiente

**Aba Variables** → click em **Raw Editor** → cola **tudo** isso de uma vez:

```env
NODE_ENV=production
PORT=3333
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=COLE_AQUI_HEX_1
JWT_REFRESH_SECRET=COLE_AQUI_HEX_2
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
COOKIE_DOMAIN=
COOKIE_SECURE=true
CORS_ORIGIN=http://localhost:3000
ADMIN_INITIAL_NAME=Tutts
ADMIN_INITIAL_CPF=SEU_CPF_SO_NUMEROS_11_DIGITOS
ADMIN_INITIAL_PASSWORD=SuaSenhaForte123
```

### 6.4. Gerar os JWT secrets

No PowerShell:

```powershell
# Roda 2 vezes — copia cada saída
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

Cada execução gera 64 caracteres hex. Cola:
- 1ª saída → substitui `COLE_AQUI_HEX_1`
- 2ª saída → substitui `COLE_AQUI_HEX_2`

⚠️ Sobre `COOKIE_DOMAIN`: **deixa vazio mesmo**. No Railway, com domínios `.up.railway.app`, deixar vazio funciona melhor que tentar setar o domínio.

Click **Update Variables**. Railway redeploya automaticamente.

### 6.5. Gerar domínio público

**Settings** → role até **Networking** → **Public Networking** → **Generate Domain**

Vai aparecer algo tipo:
```
api-production-abc123.up.railway.app
```

**Anota essa URL** — precisa dela no próximo passo.

### 6.6. Aguardar build

**Aba Deployments** → acompanha o log.

**Esperado:**
```
Installing pnpm...
Installing dependencies...
Generating Prisma Client...
Building @caixinhas/api...
✓ Build succeeded
Starting: node apps/api/dist/server.js
🚀 API rodando em http://localhost:3333
```

Se aparecer ✅ deploy successful, está OK.

### 6.7. Testar

Abre no navegador:
```
https://api-production-abc123.up.railway.app/api/health
```

**Esperado:**
```json
{"status":"ok","timestamp":"...","uptime":42.5}
```

Testa também:
```
https://api-production-abc123.up.railway.app/api/health/db
```

**Esperado:**
```json
{"status":"ok","database":"connected"}
```

---

## ✅ PASSO 7 — Rodar migrations + criar admin (5 min)

A API está rodando, mas o banco está vazio. Precisa criar as tabelas.

### 7.1. Instalar Railway CLI

```powershell
npm install -g @railway/cli
railway login
```

Abre o navegador → autoriza → volta no PowerShell.

### 7.2. Linkar projeto local

```powershell
cd C:\Users\Tutts\caixinhas
railway link
```

Setas pra selecionar:
- Projeto: `caixinhas`
- Service: `api`

### 7.3. Rodar migrations

```powershell
railway run pnpm --filter @caixinhas/database migrate:deploy
```

**Esperado:**
```
Applying migration `20260523_init`
✔ Generated Prisma Client
The following migration(s) have been applied: 20260523_init
```

### 7.4. Criar admin

```powershell
railway run pnpm --filter @caixinhas/database seed
```

**Esperado:**
```
✅ Admin criado com sucesso:
   ID: clxxxxxxx
   Nome: Tutts
   CPF: 12345678900
```

---

## ✅ PASSO 8 — Configurar serviço Web (10 min)

Volta na tela do projeto Railway → **+ New** → **GitHub Repo** → seleciona `caixinhas` (sim, o mesmo repo).

### 8.1. Renomear pra "web"

**Settings** → **Service Name** → `web` → **Update**

### 8.2. Build Command e Start Command

| Campo | Valor |
|---|---|
| **Root Directory** | (deixa vazio) |
| **Build Command** | `pnpm install --frozen-lockfile && pnpm --filter @caixinhas/web build` |
| **Start Command** | `pnpm --filter @caixinhas/web start` |
| **Watch Paths** | `apps/web/**` `packages/shared/**` |

### 8.3. Variáveis

**Variables → Raw Editor:**

```env
NEXT_PUBLIC_API_URL=https://api-production-abc123.up.railway.app
PORT=3000
```

⚠️ Substitui pelo **URL real** do seu serviço API (do passo 6.5).

### 8.4. Gerar domínio do web

**Settings → Networking → Generate Domain**

Vai gerar tipo:
```
web-production-xyz789.up.railway.app
```

**Anota essa URL.**

### 8.5. Atualizar CORS no serviço API

Volta no serviço **api** → **Variables** → edita `CORS_ORIGIN`:

```env
CORS_ORIGIN=https://web-production-xyz789.up.railway.app
```

Railway redeploya automaticamente.

### 8.6. Forçar redeploy do web

No serviço **web** → **Deployments** → click 3 pontinhos do último → **Redeploy**

**Esperado nos logs:**
```
Installing dependencies...
Building Next.js...
✓ Compiled successfully
Starting Next.js on port 3000
```

---

## ✅ PASSO 9 — Habilitar Serverless (economizar créditos) (2 min)

Em **cada serviço** (`api` e `web`):

1. **Settings** → role até **Serverless**
2. Toggle **ON**

⚠️ **NÃO ativa** no Postgres — banco precisa estar sempre disponível.

Com isso, serviços param quando não tem tráfego. Religa em ~5s na primeira request depois de inatividade.

---

## ✅ PASSO 10 — Primeiro login (3 min)

1. Abre `https://web-production-xyz789.up.railway.app`
2. Deve redirecionar pro `/login`
3. **CPF:** o que você colocou em `ADMIN_INITIAL_CPF`
4. **Senha:** o que você colocou em `ADMIN_INITIAL_PASSWORD`
5. Click **Entrar**

**Esperado:** redireciona pra `/dashboard` mostrando "Olá, administrador".

---

## 🎉 Pronto!

A Fase 0 está em produção. A partir daqui:

### Workflow de desenvolvimento

```powershell
cd C:\Users\Tutts\caixinhas
git checkout -b feature/lista-usuarios

# ... codar ...

# Testar local
pnpm dev
# API: http://localhost:3333
# Web: http://localhost:3000

# Subir
git add .
git commit -m "feat: tela de listagem de usuários"
git push origin feature/lista-usuarios

# Abre PR no GitHub → CI roda
# Merge na main → Railway redeploya automaticamente
```

### Próximos passos (Fase 1)

Avisa que tudo está funcionando que eu parto pra **Fase 1**:
- CRUD admin de usuários
- Tela admin lista usuários + abre detalhe com PIX
- Middleware Next.js redirecionando por role
- Tela "Editar perfil" pro user atualizar PIX

---

## 🚨 Troubleshooting

| Sintoma | O que checar |
|---|---|
| Build falha em "pnpm install" | Versão Node em Settings → garantir 20+ |
| Build falha em "prisma generate" | `DATABASE_URL` está como `${{Postgres.DATABASE_URL}}`? |
| API sobe mas `/health/db` dá erro | Postgres ainda está provisionando, aguarda 1min |
| CORS error no navegador | `CORS_ORIGIN` no API tem a URL **exata** do web? |
| "Cookie not set" no login | `COOKIE_SECURE=true` e está usando HTTPS? |
| Login funciona mas refresh falha | `COOKIE_DOMAIN` deve estar vazio nas vars |
| 401 em todas as requests | JWT secrets têm 32+ chars? |
| Página em branco no web | `NEXT_PUBLIC_API_URL` está com a URL completa (com https)? |

---

## 💰 Custo estimado

Com serverless ON em api+web e baixo tráfego:

| Serviço | Estimado |
|---|---|
| api | ~$0.50/mês |
| web | ~$0.50/mês |
| postgres | ~$1-2/mês |
| **Total real** | **~$2-3/mês** |

Mais a taxa fixa do plano Hobby ($5/mês), que o trial cobre nos primeiros ~15 dias.
