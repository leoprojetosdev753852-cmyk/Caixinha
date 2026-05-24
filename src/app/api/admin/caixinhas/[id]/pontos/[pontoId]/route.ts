import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { atualizarPontoSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';

interface Ctx {
  params: { id: string; pontoId: string };
}

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = atualizarPontoSchema.parse(body);

  const ponto = await prisma.pontoCaixinha.findUnique({
    where: { id: params.pontoId },
    include: { caixinha: true },
  });

  if (!ponto || ponto.caixinhaId !== params.id) {
    return errorResponse('Ponto não encontrado', 404, 'NOT_FOUND');
  }

  if (ponto.caixinha.status === 'ATIVA' || ponto.caixinha.status === 'CONCLUIDA') {
    return errorResponse(
      'Não pode editar pontos de caixinha já ativada',
      400,
      'CAIXINHA_ATIVA',
    );
  }

  const atualizado = await prisma.pontoCaixinha.update({
    where: { id: params.pontoId },
    data: {
      valor: data.valor,
      dataContemplacao:
        data.dataContemplacao === null
          ? null
          : data.dataContemplacao
            ? new Date(data.dataContemplacao)
            : undefined,
    },
  });

  return NextResponse.json(atualizado);
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const ponto = await prisma.pontoCaixinha.findUnique({
    where: { id: params.pontoId },
    include: { caixinha: true },
  });

  if (!ponto || ponto.caixinhaId !== params.id) {
    return errorResponse('Ponto não encontrado', 404, 'NOT_FOUND');
  }

  if (ponto.caixinha.status !== 'RASCUNHO') {
    return errorResponse('Só pontos de caixinha em rascunho podem ser removidos', 400);
  }

  await prisma.pontoCaixinha.delete({ where: { id: params.pontoId } });
  return NextResponse.json({ ok: true });
});
