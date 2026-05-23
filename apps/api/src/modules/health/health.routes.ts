import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@caixinhas/database';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  app.get('/db', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  });
};
