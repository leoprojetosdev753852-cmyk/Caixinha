# 🚀 Deploy

Veja [PASSO-A-PASSO.md](./PASSO-A-PASSO.md) para o passo a passo completo.

## Resumo

1. Push no GitHub
2. Railway: New Project → from GitHub
3. Add PostgreSQL
4. Serviço `api`: configura build + start + vars
5. Migrations + seed via Railway CLI
6. Serviço `web`: configura build + start + vars
7. Atualiza CORS_ORIGIN no api
8. Habilita Serverless em api/web
9. Login!

## Variáveis críticas

### Serviço API

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
COOKIE_DOMAIN=
COOKIE_SECURE=true
CORS_ORIGIN=https://web-XXX.up.railway.app
ADMIN_INITIAL_CPF=...
ADMIN_INITIAL_PASSWORD=...
```

### Serviço Web

```env
NEXT_PUBLIC_API_URL=https://api-XXX.up.railway.app
PORT=3000
```
