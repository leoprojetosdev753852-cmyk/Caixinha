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
    include: { parcelas: true, pagamentos: true },
  });

  let totalAtivos = emprestimos.length;
  let totalAtrasados = 0;

  let valorCapitalPendente = 0; // capital ainda a receber
  let valorJurosAReceber = 0; // só os juros
  let valorTotalAReceber = 0; // capital + juros

  for (const e of emprestimos) {
    const jaPago = e.pagamentos.reduce((acc, p) => acc + p.valorPago, 0);
    const capitalPago = e.pagamentos.reduce((acc, p) => acc + p.valorCapital, 0);
    const capitalRestante = Math.max(0, e.valorOriginal - capitalPago);

    if (e.tipo === 'A_VISTA' && e.dataVencimento) {
      const calc = calcularEmprestimoAVista({
        valorOriginal: capitalRestante,
        percentualJuros: Number(e.percentualJuros),
        percentualJurosAtraso: Number(e.percentualJurosAtraso),
        dataVencimento: e.dataVencimento,
        dataReferencia: hoje,
      });

      valorCapitalPendente += capitalRestante;
      valorJurosAReceber += calc.valorJuros + calc.valorJurosAtraso;
      valorTotalAReceber += calc.valorTotal;

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
          valorTotalAReceber += calc.valorTotal;
          valorJurosAReceber += calc.valorJurosAtraso;
          valorCapitalPendente += parc.valorDevido;
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
      valorEmprestado: valorCapitalPendente,
      jurosAReceber: valorJurosAReceber,
      valorAReceber: valorTotalAReceber,
    },
  });
});
