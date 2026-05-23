import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await requireAuth(req.headers.get('authorization'));

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.sub },
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
    return errorResponse('Usuário não encontrado', 404, 'NOT_FOUND');
  }

  return NextResponse.json(usuario);
});
