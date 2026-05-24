import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { limparCPF, validarCPF } from '@/shared';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { cpf, convite } = body as { cpf?: string; convite?: string };

  // Caminho 1: convite (id do usuário) — usado quando admin cadastrou sem CPF
  if (convite) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: convite },
      select: { id: true, nomeCompleto: true, cpf: true, perfilCompleto: true, ativo: true },
    });

    if (!usuario || !usuario.ativo) {
      return errorResponse('Convite inválido', 404, 'INVALID_INVITE');
    }

    return NextResponse.json({
      modo: 'convite',
      usuarioId: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      precisaCpf: !usuario.cpf,
      perfilCompleto: usuario.perfilCompleto,
    });
  }

  // Caminho 2: CPF direto
  if (!cpf) {
    return errorResponse('CPF obrigatório', 400, 'MISSING_CPF');
  }

  const cpfLimpo = limparCPF(cpf);
  if (cpfLimpo.length !== 11 || !validarCPF(cpfLimpo)) {
    return errorResponse('CPF inválido', 400, 'INVALID_CPF');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { cpf: cpfLimpo },
    select: {
      id: true,
      nomeCompleto: true,
      cpf: true,
      perfilCompleto: true,
      ativo: true,
      senhaHash: true,
    },
  });

  if (!usuario || !usuario.ativo) {
    return errorResponse('CPF não encontrado', 404, 'NOT_FOUND');
  }

  return NextResponse.json({
    modo: 'cpf',
    usuarioId: usuario.id,
    nomeCompleto: usuario.nomeCompleto,
    perfilCompleto: usuario.perfilCompleto,
    temSenha: !!usuario.senhaHash,
  });
});
