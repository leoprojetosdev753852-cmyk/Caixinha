import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-helpers';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await requireAuth(req.headers.get('authorization'));

  const cotas = await prisma.cotaPonto.findMany({
    where: { usuarioId: user.sub },
    include: {
      ponto: {
        include: {
          caixinha: { select: { id: true, nome: true, status: true } },
        },
      },
      pagamentos: { orderBy: { dataVencimento: 'asc' } },
    },
    orderBy: { criadoEm: 'desc' },
  });

  // Agrupa por caixinha
  const porCaixinha = new Map<string, any>();
  for (const cota of cotas) {
    const cId = cota.ponto.caixinha.id;
    if (!porCaixinha.has(cId)) {
      porCaixinha.set(cId, {
        caixinha: cota.ponto.caixinha,
        participacoes: [],
      });
    }
    porCaixinha.get(cId)!.participacoes.push({
      cotaId: cota.id,
      valorCota: cota.valor,
      ponto: {
        id: cota.ponto.id,
        numero: cota.ponto.numero,
        valor: cota.ponto.valor,
        dataContemplacao: cota.ponto.dataContemplacao,
      },
      pagamentos: cota.pagamentos,
    });
  }

  return NextResponse.json({ caixinhas: Array.from(porCaixinha.values()) });
});
