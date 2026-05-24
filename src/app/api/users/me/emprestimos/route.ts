import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-helpers';
import { calcularEmprestimoAVista, calcularParcela } from '@/lib/calculadora';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const user = await requireAuth(req.headers.get('authorization'));

  const emprestimos = await prisma.emprestimo.findMany({
    where: { usuarioId: user.sub },
    include: { parcelas: { orderBy: { numero: 'asc' } } },
    orderBy: { criadoEm: 'desc' },
  });

  const hoje = new Date();

  const result = emprestimos.map((e) => {
    let valorAtual = 0;
    let diasAtrasoAtual = 0;

    if (e.tipo === 'A_VISTA' && e.dataVencimento) {
      const calc = calcularEmprestimoAVista({
        valorOriginal: e.valorOriginal,
        percentualJuros: Number(e.percentualJuros),
        percentualJurosAtraso: Number(e.percentualJurosAtraso),
        dataVencimento: e.dataVencimento,
        dataReferencia: e.status === 'QUITADO' ? (e.dataPagamento ?? hoje) : hoje,
      });
      valorAtual = e.status === 'QUITADO' ? e.valorPago : calc.valorTotal;
      diasAtrasoAtual = calc.diasAtraso;
    }

    return {
      ...e,
      valorAtual,
      diasAtrasoAtual,
    };
  });

  return NextResponse.json({ emprestimos: result });
});
