import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { loginSchema, checkCpfSchema, firstAccessSchema } from '@caixinhas/shared';
import { AuthService } from './auth.service';
import { env } from '../../env';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  domain: env.COOKIE_DOMAIN,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60,
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  const router = app.withTypeProvider<ZodTypeProvider>();
  const service = new AuthService(app);

  router.post(
    '/check-cpf',
    {
      schema: { body: checkCpfSchema },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request) => service.checkCpf(request.body),
  );

  router.post(
    '/login',
    {
      schema: { body: loginSchema },
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const { accessToken, refreshToken, user } = await service.login(request.body);
      reply.setCookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      return { accessToken, user };
    },
  );

  router.post(
    '/first-access',
    {
      schema: { body: firstAccessSchema },
      config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const { confirmacaoDados: _ignored, confirmarSenha: _ignored2, ...input } = request.body;
      const { accessToken, refreshToken, user } = await service.firstAccess(input);
      reply.setCookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      return { accessToken, user };
    },
  );

  router.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      return reply.status(401).send({ error: 'NO_REFRESH_TOKEN', message: 'Sem refresh token' });
    }
    const tokens = await service.refresh(refreshToken);
    reply.setCookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken: tokens.accessToken, user: tokens.user };
  });

  router.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      await service.logout(refreshToken);
    }
    reply.clearCookie('refreshToken', { path: '/api/auth', domain: env.COOKIE_DOMAIN });
    return { ok: true };
  });
};
