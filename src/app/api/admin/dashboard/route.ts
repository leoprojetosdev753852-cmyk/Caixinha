import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-helpers';
import { calcularEmprestimoAVista, calcularParcela } from '@/lib/calculadora';

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin(req.headers.get('authorization'));

  const hoje = new Date();

  // CAIXINHAS
  const caixinhasAtivas = await prisma.caixinha.findMany({
    where: { status: 'ATIVA' },
    include: {
      pontos: {
        include: {
          cotas: { include: { pagamentos: true } },
        },
      },
    },
  });

  let totalCaixinhasAtivas = caixinhasAtivas.length;
  let pontosEmAberto = 0;
  let pagamentosPendentes = 0;
  let valorPendenteCaixinhas = 0;

  const drilldownPontosVagos: Array<{
    caixinhaId: string;
    caixinhaNome: string;
    pontoNumero: number;
    valorVago: number;
  }> = [];

  for (const c of caixinhasAtivas) {
    for (const p of c.pontos) {
      const somaCotas = p.cotas.reduce((acc, ct) => acc + ct.valor, 0);
      const vago = p.valor - somaCotas;
      if (vago > 0) {
        pontosEmAberto++;
        drilldownPontosVagos.push({
          caixinhaId: c.id,
          caixinhaNome: c.nome,
          pontoNumero: p.numero,
          valorVago: vago,
        });
      }
      for (const cota of p.cotas) {
        for (const pag of cota.pagamentos) {
          if (pag.status !== 'PAGO') {
            pagamentosPendentes++;
            valorPendenteCaixinhas += pag.valorDevido;
          }
        }
      }
    }
  }

  // EMPRÉSTIMOS
  const emprestimos = await prisma.emprestimo.findMany({
    where: { status: { in: ['ATIVO', 'ATRASADO'] } },
    include: { parcelas: true },
  });

  let totalEmprestimosAtivos = emprestimos.length;
  let valorEmprestado = 0;
  let valorAReceber = 0;

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
    } else if (e.tipo === 'PARCELADO') {
      for (const parc of e.parcelas) {
        if (parc.status !== 'PAGO') {
          const calc = calcularParcela({
            valorDevido: parc.valorDevido,
            percentualJurosAtraso: Number(e.percentualJurosAtraso),
            dataVencimento: parc.dataVencimento,
            dataReferencia: hoje,
          });
          valorAReceber += calc.valorTotal;
        }
      }
    }
  }

  return NextResponse.json({
    caixinhas: {
      ativas: totalCaixinhasAtivas,
      pontosEmAberto,
      pagamentosPendentes,
      valorPendente: valorPendenteCaixinhas,
      drilldownPontosVagos,
    },
    emprestimos: {
      ativos: totalEmprestimosAtivos,
      valorEmprestado,
      valorAReceber,
    },
  });
});
