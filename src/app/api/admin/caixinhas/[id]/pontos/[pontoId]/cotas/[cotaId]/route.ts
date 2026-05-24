import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { atualizarCotaSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';

interface Ctx {
  params: { id: string; pontoId: string; cotaId: string };
}

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = atualizarCotaSchema.parse(body);

  const cota = await prisma.cotaPonto.findUnique({
    where: { id: params.cotaId },
    include: {
      ponto: { include: { caixinha: true, cotas: true } },
    },
  });

  if (!cota || cota.pontoId !== params.pontoId) {
    return errorResponse('Cota não encontrada', 404, 'NOT_FOUND');
  }

  if (cota.ponto.caixinha.status !== 'RASCUNHO') {
    return errorResponse('Só pode editar cotas em rascunho', 400, 'CAIXINHA_ATIVA');
  }

  // Valida soma <= valor do ponto
  const outras = cota.ponto.cotas.filter((c) => c.id !== cota.id);
  const somaOutras = outras.reduce((acc, c) => acc + c.valor, 0);
  if (somaOutras + data.valor > cota.ponto.valor) {
    return errorResponse(
      `Soma ultrapassa valor do ponto. Disponível: ${cota.ponto.valor - somaOutras}`,
      400,
      'COTAS_EXCEDEM_VALOR',
    );
  }

  const atualizada = await prisma.cotaPonto.update({
    where: { id: params.cotaId },
    data: { valor: data.valor },
  });
  return NextResponse.json(atualizada);
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const cota = await prisma.cotaPonto.findUnique({
    where: { id: params.cotaId },
    include: { ponto: { include: { caixinha: true } } },
  });

  if (!cota || cota.pontoId !== params.pontoId) {
    return errorResponse('Cota não encontrada', 404, 'NOT_FOUND');
  }

  if (cota.ponto.caixinha.status !== 'RASCUNHO') {
    return errorResponse('Só pode remover cotas em rascunho', 400, 'CAIXINHA_ATIVA');
  }

  await prisma.cotaPonto.delete({ where: { id: params.cotaId } });
  return NextResponse.json({ ok: true });
});
