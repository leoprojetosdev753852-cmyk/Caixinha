# 🏗️ Arquitetura

## Stack

| Camada | Tech |
|---|---|
| Backend | Node.js 20 + Fastify + TypeScript |
| ORM | Prisma 5 |
| Banco | PostgreSQL (Railway) |
| Auth | JWT dual-token + httpOnly cookies + bcrypt |
| Frontend | Next.js 14 + Tailwind + shadcn/ui |
| Estado | Zustand + TanStack Query |
| Validação | Zod (compartilhado front+back) |
| Deploy | Railway (full stack) |

## Estrutura

```
caixinhas/
├── apps/
│   ├── api/        # Backend Fastify
│   │   └── src/
│   │       ├── modules/        # auth, users, health, (futuro: caixinhas, emprestimos)
│   │       ├── middlewares/    # auth, error-handler
│   │       ├── shared/         # AppError, utils
│   │       └── worker/         # Cron jobs
│   └── web/        # Next.js
│       └── src/
│           ├── app/
│           │   ├── (auth)/     # login, primeiro-acesso (público)
│           │   ├── (admin)/    # dashboard, caixinhas, emprestimos, usuarios
│           │   └── (user)/     # home, caixinhas, emprestimos, perfil
│           ├── components/
│           ├── lib/            # api-client, utils
│           └── stores/         # Zustand
└── packages/
    ├── database/   # Prisma schema + seed
    └── shared/     # CPF, money, schemas Zod
```

## Modelagem do banco (resumo)

- **Usuario** — admin ou user, com PIX após 1º acesso
- **RefreshToken** — rotação de tokens
- **Caixinha** — consórcio (valor total, N pontos, N meses)
- **PontoCaixinha** — slot dentro da caixinha (1 usuário por ponto, mês de contemplação)
- **PagamentoPonto** — 1 registro por mês × ponto (status: PENDENTE/PAGO/ATRASADO)
- **Emprestimo** — valor + juros normal + juros atraso por dia
- **Auditoria** — log de ações

## Fluxo de auth

```
1. Admin cadastra: POST /api/users { nomeCompleto, cpf }
   → senhaHash=null, perfilCompleto=false

2. User 1º acesso:
   POST /api/auth/check-cpf { cpf }
   → { existe: true, primeiroAcesso: true }
   POST /api/auth/first-access { cpf, senha, tipoChavePix, chavePix, confirmacaoDados: true }
   → accessToken + refreshToken em cookie

3. Login normal:
   POST /api/auth/login { cpf, senha }
   → accessToken + refreshToken em cookie

4. Refresh automático:
   Frontend recebe 401 → POST /api/auth/refresh (cookie)
   → novo accessToken + novo refreshToken (rotação)
```

## Lógica de caixinha (consórcio rotativo)

Caixinha de R$ 10.000, 10 pontos, dia 10:
- Cada ponto = R$ 1.000 (valorPorPonto)
- 10 meses de duração (duracaoMeses)
- Cada ponto tem `mesContemplacao` (1..10) — mês em que aquele ponto "recebe" o bolão
- 100 PagamentoPonto criados (10 pontos × 10 meses)
- Cada um com `valorDevido=100000` (centavos) e `dataVencimento` calculada

Admin "dá baixa" → marca `PagamentoPonto.status=PAGO` + `dataPagamento`.

## Lógica de empréstimo

```
Empréstimo R$1.000, juros 10%, juros atraso 0,5%/dia, venc. 30/05

Pago dentro do prazo:
  valor a receber = 1000 + 10% = R$ 1.100

Pago com 5 dias atraso:
  base = 1000 + 10% = 1100
  atraso = 1100 × 0,5% × 5 = 27,50
  valor a receber = R$ 1.127,50
```

## Segurança

- Senhas: bcrypt (rounds=10)
- Tokens: JWT HS256, access 15min + refresh 7d
- Refresh em httpOnly cookie (não acessível por JS)
- Rate limit: 5 logins/15min, 3 first-access/15min
- CORS restrito a domínio do front
- Helmet headers
- Validação Zod em toda entrada
- Auditoria de ações sensíveis

## Padrões obrigatórios

1. **Dinheiro em centavos (Int)** — nunca Float
2. **Queries via Prisma** — nunca SQL string
3. **Erros via `AppError`** — nunca throw direto
4. **Auth via middleware** — `verificarToken` ou `verificarAdmin`
5. **Validação Zod em rotas** — schema antes do handler
