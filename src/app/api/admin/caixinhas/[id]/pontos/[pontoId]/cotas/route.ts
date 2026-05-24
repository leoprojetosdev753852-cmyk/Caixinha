import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { criarCotaSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';

interface Ctx {
  params: { id: string; pontoId: string };
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = criarCotaSchema.parse(body);

  const ponto = await prisma.pontoCaixinha.findUnique({
    where: { id: params.pontoId },
    include: { caixinha: true, cotas: true },
  });

  if (!ponto || ponto.caixinhaId !== params.id) {
    return errorResponse('Ponto não encontrado', 404, 'NOT_FOUND');
  }

  if (ponto.caixinha.status !== 'RASCUNHO') {
    return errorResponse(
      'Só pode adicionar cotistas em caixinha rascunho',
      400,
      'CAIXINHA_ATIVA',
    );
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: data.usuarioId } });
  if (!usuario || !usuario.ativo) {
    return errorResponse('Usuário inválido', 400, 'INVALID_USER');
  }

  // Não permite duplicar usuário no mesmo ponto
  if (ponto.cotas.some((c) => c.usuarioId === data.usuarioId)) {
    return errorResponse('Este usuário já está neste ponto', 409, 'DUPLICATE_USER');
  }

  // Valida soma <= valor do ponto
  const somaAtual = ponto.cotas.reduce((acc, c) => acc + c.valor, 0);
  if (somaAtual + data.valor > ponto.valor) {
    return errorResponse(
      `Soma das cotas ultrapassa valor do ponto. Disponível: ${ponto.valor - somaAtual}`,
      400,
      'COTAS_EXCEDEM_VALOR',
    );
  }

  const cota = await prisma.cotaPonto.create({
    data: {
      pontoId: ponto.id,
      usuarioId: data.usuarioId,
      valor: data.valor,
    },
    include: { usuario: { select: { id: true, nomeCompleto: true } } },
  });

  return NextResponse.json(cota, { status: 201 });
});
