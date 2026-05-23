# 💰 Caixinhas

Sistema mobile-first para gestão de caixinhas (consórcio rotativo) e empréstimos pessoais.

## Stack

- **Backend:** Node.js 20 + Fastify + TypeScript + Prisma
- **Frontend:** Next.js 14 + Tailwind + shadcn/ui (PWA)
- **Banco:** PostgreSQL
- **Deploy:** Railway (full stack)

## Estrutura

```
caixinhas/
├── apps/
│   ├── api/        # Backend Fastify
│   └── web/        # Frontend Next.js
└── packages/
    ├── database/   # Prisma schema + client
    └── shared/     # Tipos e schemas Zod compartilhados
```

## Setup local

### Pré-requisitos
- Node.js 20+
- pnpm 8+
- PostgreSQL local OU acesso a um banco remoto (Railway)

### Passos

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar env
cp .env.example .env
# Editar .env com DATABASE_URL e gerar JWT secrets:
#   openssl rand -hex 32

# 3. Rodar migrations
pnpm db:migrate

# 4. Criar admin inicial
pnpm db:seed

# 5. Iniciar dev
pnpm dev
```

Backend: http://localhost:3333
Frontend: http://localhost:3000

## Documentação

- [`PASSO-A-PASSO.md`](./PASSO-A-PASSO.md) — Setup completo passo a passo
- [`DEPLOY.md`](./DEPLOY.md) — Deploy no Railway
- [`ARQUITETURA.md`](./ARQUITETURA.md) — Visão geral da arquitetura
