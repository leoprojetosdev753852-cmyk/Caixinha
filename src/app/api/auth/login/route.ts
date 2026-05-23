import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { createSession, getRefreshCookieOptions } from '@/lib/auth';
import { loginSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { cpf, senha } = loginSchema.parse(body);

  const usuario = await prisma.usuario.findUnique({ where: { cpf } });

  if (!usuario || !usuario.ativo || !usuario.senhaHash) {
    return errorResponse('CPF ou senha inválidos', 401, 'INVALID_CREDENTIALS');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) {
    return errorResponse('CPF ou senha inválidos', 401, 'INVALID_CREDENTIALS');
  }

  const { accessToken, refreshToken } = await createSession(usuario.id, usuario.cpf, usuario.role);

  const response = NextResponse.json({
    accessToken,
    user: {
      id: usuario.id,
      cpf: usuario.cpf,
      role: usuario.role,
      nomeCompleto: usuario.nomeCompleto,
    },
  });

  response.cookies.set('refreshToken', refreshToken, getRefreshCookieOptions());
  return response;
});
