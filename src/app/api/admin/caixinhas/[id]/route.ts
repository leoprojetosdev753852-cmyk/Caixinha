import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';

interface Ctx {
  params: { id: string };
}

export const GET = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const caixinha = await prisma.caixinha.findUnique({
    where: { id: params.id },
    include: {
      pontos: {
        orderBy: { numero: 'asc' },
        include: {
          cotas: {
            include: {
              usuario: { select: { id: true, nomeCompleto: true, cpf: true } },
              pagamentos: { orderBy: { dataVencimento: 'asc' } },
            },
          },
        },
      },
    },
  });

  if (!caixinha) return errorResponse('Caixinha não encontrada', 404, 'NOT_FOUND');

  return NextResponse.json(caixinha);
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const c = await prisma.caixinha.findUnique({ where: { id: params.id } });
  if (!c) return errorResponse('Caixinha não encontrada', 404, 'NOT_FOUND');

  if (c.status === 'ATIVA') {
    return errorResponse('Caixinha ativa não pode ser excluída', 400, 'CAIXINHA_ATIVA');
  }

  await prisma.caixinha.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
