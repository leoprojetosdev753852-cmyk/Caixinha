import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { createSession, getRefreshCookieOptions } from '@/lib/auth';
import { firstAccessSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = firstAccessSchema.parse(body);

  const usuario = await prisma.usuario.findUnique({ where: { cpf: parsed.cpf } });

  if (!usuario || !usuario.ativo) {
    return errorResponse('CPF não encontrado', 401, 'CPF_NOT_FOUND');
  }

  if (usuario.senhaHash !== null) {
    return errorResponse(
      'Este usuário já possui senha. Faça login normalmente.',
      409,
      'ALREADY_REGISTERED',
    );
  }

  const senhaHash = await bcrypt.hash(parsed.senha, 10);

  const atualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      senhaHash,
      tipoChavePix: parsed.tipoChavePix,
      chavePix: parsed.chavePix,
      perfilCompleto: true,
    },
  });

  const { accessToken, refreshToken } = await createSession(
    atualizado.id,
    atualizado.cpf,
    atualizado.role,
  );

  const response = NextResponse.json({
    accessToken,
    user: {
      id: atualizado.id,
      cpf: atualizado.cpf,
      role: atualizado.role,
      nomeCompleto: atualizado.nomeCompleto,
    },
  });

  response.cookies.set('refreshToken', refreshToken, getRefreshCookieOptions());
  return response;
});
