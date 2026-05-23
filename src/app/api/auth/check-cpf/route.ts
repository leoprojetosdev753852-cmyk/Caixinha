import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkCpfSchema } from '@/shared';
import { withErrorHandling } from '@/lib/api-helpers';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { cpf } = checkCpfSchema.parse(body);

  const usuario = await prisma.usuario.findUnique({
    where: { cpf },
    select: { id: true, perfilCompleto: true, ativo: true, senhaHash: true },
  });

  if (!usuario || !usuario.ativo) {
    return NextResponse.json({
      existe: false,
      perfilCompleto: false,
      primeiroAcesso: false,
    });
  }

  return NextResponse.json({
    existe: true,
    perfilCompleto: usuario.perfilCompleto,
    primeiroAcesso: usuario.senhaHash === null,
  });
});
