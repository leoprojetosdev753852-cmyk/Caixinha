import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { atualizarPerfilFinanceiroSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

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

  if (!usuario) return errorResponse('Usuário não encontrado', 404, 'NOT_FOUND');

  return NextResponse.json(usuario);
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const user = await requireAuth(req.headers.get('authorization'));

  const body = await req.json();
  const { tipoChavePix, chavePix } = atualizarPerfilFinanceiroSchema.parse(body);

  const atualizado = await prisma.usuario.update({
    where: { id: user.sub },
    data: { tipoChavePix, chavePix, perfilCompleto: true },
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

  await registrarAuditoria({
    categoria: AUDIT.PIX_ATUALIZADO,
    acao: 'Usuário atualizou sua chave PIX',
    usuarioId: user.sub,
    metadata: { tipoChavePix },
  });

  return NextResponse.json(atualizado);
});
