import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, getRefreshCookieOptions, verifyRefreshToken } from '@/lib/auth';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const refreshToken = req.cookies.get('refreshToken')?.value;
  if (!refreshToken) {
    return errorResponse('Sem refresh token', 401, 'NO_REFRESH_TOKEN');
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return errorResponse('Refresh token inválido', 401, 'INVALID_REFRESH_TOKEN');
  }

  const tokenDb = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { usuario: true },
  });

  if (!tokenDb || tokenDb.revogado || tokenDb.expiraEm < new Date()) {
    return errorResponse('Refresh token inválido', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (!tokenDb.usuario.ativo) {
    return errorResponse('Usuário inativo', 401, 'USER_INACTIVE');
  }

  // Rotação: revoga atual, gera novo par
  await prisma.refreshToken.update({
    where: { id: tokenDb.id },
    data: { revogado: true },
  });

  const { accessToken, refreshToken: newRefresh } = await createSession(
    tokenDb.usuario.id,
    tokenDb.usuario.cpf,
    tokenDb.usuario.role,
  );

  const response = NextResponse.json({
    accessToken,
    user: {
      id: tokenDb.usuario.id,
      cpf: tokenDb.usuario.cpf,
      role: tokenDb.usuario.role,
      nomeCompleto: tokenDb.usuario.nomeCompleto,
    },
  });

  response.cookies.set('refreshToken', newRefresh, getRefreshCookieOptions());
  return response;
});
