import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-helpers';
import { calcularEmprestimoAVista, calcularParcela } from '@/lib/calculadora';

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin(req.headers.get('authorization'));

  const hoje = new Date();

  const emprestimos = await prisma.emprestimo.findMany({
    where: { status: { in: ['ATIVO', 'ATRASADO'] } },
    include: { parcelas: true },
  });

  let totalAtivos = emprestimos.length;
  let valorEmprestado = 0;
  let valorAReceber = 0;
  let totalAtrasados = 0;

  for (const e of emprestimos) {
    valorEmprestado += e.valorOriginal;

    if (e.tipo === 'A_VISTA' && e.dataVencimento) {
      const calc = calcularEmprestimoAVista({
        valorOriginal: e.valorOriginal,
        percentualJuros: Number(e.percentualJuros),
        percentualJurosAtraso: Number(e.percentualJurosAtraso),
        dataVencimento: e.dataVencimento,
        dataReferencia: hoje,
      });
      valorAReceber += calc.valorTotal;
      if (calc.diasAtraso > 0) totalAtrasados++;
    } else if (e.tipo === 'PARCELADO') {
      let temAtraso = false;
      for (const parc of e.parcelas) {
        if (parc.status !== 'PAGO') {
          const calc = calcularParcela({
            valorDevido: parc.valorDevido,
            percentualJurosAtraso: Number(e.percentualJurosAtraso),
            dataVencimento: parc.dataVencimento,
            dataReferencia: hoje,
          });
          valorAReceber += calc.valorTotal;
          if (calc.diasAtraso > 0) temAtraso = true;
        }
      }
      if (temAtraso) totalAtrasados++;
    }
  }

  return NextResponse.json({
    emprestimos: {
      ativos: totalAtivos,
      atrasados: totalAtrasados,
      valorEmprestado,
      valorAReceber,
    },
  });
});
