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
    return errorResponse('Refresh token invalido', 401, 'INVALID_REFRESH_TOKEN');
  }

  const tokenDb = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { usuario: true },
  });

  if (!tokenDb || tokenDb.revogado || tokenDb.expiraEm < new Date()) {
    return errorResponse('Refresh token invalido', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (!tokenDb.usuario.ativo) {
    return errorResponse('Usuario inativo', 401, 'USER_INACTIVE');
  }

  // Rotacao: revoga atual, gera novo par
  await prisma.refreshToken.update({
    where: { id: tokenDb.id },
    data: { revogado: true },
  });

  // Identificador: cpf real, ou username (admin), ou id (fallback)
  const identidade = tokenDb.usuario.cpf || tokenDb.usuario.username || tokenDb.usuario.id;

  const { accessToken, refreshToken: newRefresh } = await createSession(
    tokenDb.usuario.id,
    identidade,
    tokenDb.usuario.role,
  );

  const response = NextResponse.json({
    accessToken,
    user: {
      id: tokenDb.usuario.id,
      cpf: tokenDb.usuario.cpf,
      username: tokenDb.usuario.username,
      role: tokenDb.usuario.role,
      nomeCompleto: tokenDb.usuario.nomeCompleto,
    },
  });

  response.cookies.set('refreshToken', newRefresh, getRefreshCookieOptions());
  return response;
});