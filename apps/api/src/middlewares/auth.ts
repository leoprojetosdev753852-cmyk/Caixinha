import { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../shared/errors/app-error';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      cpf: string;
      role: 'ADMIN' | 'USER';
    };
  }
}

export async function verificarToken(request: FastifyRequest, _reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<{
      sub: string;
      cpf: string;
      role: 'ADMIN' | 'USER';
    }>();

    request.user = {
      id: decoded.sub,
      cpf: decoded.cpf,
      role: decoded.role,
    };
  } catch {
    throw AppError.unauthorized('Token inválido ou expirado', 'INVALID_TOKEN');
  }
}

export async function verificarAdmin(request: FastifyRequest, reply: FastifyReply) {
  await verificarToken(request, reply);

  if (request.user?.role !== 'ADMIN') {
    throw AppError.forbidden('Acesso restrito a administradores', 'ADMIN_REQUIRED');
  }
}
