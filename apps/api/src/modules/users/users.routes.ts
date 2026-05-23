import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@caixinhas/database';
import { verificarToken } from '../../middlewares/auth';
import { AppError } from '../../shared/errors/app-error';

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/me',
    { onRequest: [verificarToken] },
    async (request) => {
      const usuario = await prisma.usuario.findUnique({
        where: { id: request.user!.id },
        select: {
          id: true,
          nomeCompleto: true,
          cpf: true,
          role: true,
          perfilCompleto: true,
          tipoChavePix: true,
          chavePix: true,
        },
      });

      if (!usuario) {
        throw AppError.notFound('Usuário não encontrado');
      }

      return usuario;
    },
  );
};
