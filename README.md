# 💰 Caixinha

Sistema mobile-first para gestão de caixinhas (consórcio rotativo) e empréstimos pessoais.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Estilo:** Tailwind + shadcn/ui
- **Banco:** PostgreSQL (Supabase)
- **ORM:** Prisma 5
- **Auth:** JWT (jose) + httpOnly cookies + bcrypt
- **Deploy:** Vercel
- **Cron:** GitHub Actions

## Estrutura

```
src/
├── app/
│   ├── api/          # Backend (Next.js Route Handlers)
│   │   ├── auth/     # login, check-cpf, first-access, refresh, logout
│   │   ├── users/    # /me
│   │   ├── cron/     # endpoints chamados pelo GitHub Actions
│   │   └── health/   # health check
│   ├── (auth)/       # login, primeiro-acesso
│   ├── (admin)/      # dashboard, caixinhas, emprestimos, usuarios
│   └── (user)/       # home, caixinhas, emprestimos, perfil
├── components/
├── lib/              # prisma, auth, api-client, utils
├── shared/           # validações compartilhadas (CPF, money, schemas Zod)
└── stores/           # Zustand stores

prisma/
├── schema.prisma
└── seed.ts
```

## Setup local

```bash
# 1. Instalar
npm install

# 2. Configurar .env (copia .env.example)
cp .env.example .env

# 3. Gerar Prisma Client
npx prisma generate

# 4. Rodar migrations
npx prisma migrate dev --name init

# 5. Criar admin inicial
npm run db:seed

# 6. Subir dev
npm run dev
```

Abre http://localhost:3000

## Deploy

Veja [`PASSO-A-PASSO.md`](./PASSO-A-PASSO.md) — passo a passo completo do GitHub → Supabase → Vercel.

## Custo

**$0/mês.** Vercel free + Supabase free + GitHub Actions free.
