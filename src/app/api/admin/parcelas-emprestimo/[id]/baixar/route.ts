import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { baixarParcelaSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';
import { calcularParcela } from '@/lib/calculadora';

interface Ctx {
  params: { id: string };
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const { dataPagamento, observacao } = baixarParcelaSchema.parse(body);

  const parcela = await prisma.parcelaEmprestimo.findUnique({
    where: { id: params.id },
    include: {
      emprestimo: {
        include: {
          usuario: { select: { nomeCompleto: true } },
          parcelas: true,
        },
      },
    },
  });

  if (!parcela) return errorResponse('Parcela não encontrada', 404, 'NOT_FOUND');
  if (parcela.status === 'PAGO') {
    return errorResponse('Parcela já paga', 400);
  }

  const calc = calcularParcela({
    valorDevido: parcela.valorDevido,
    percentualJurosAtraso: Number(parcela.emprestimo.percentualJurosAtraso),
    dataVencimento: parcela.dataVencimento,
    dataReferencia: new Date(dataPagamento),
  });

  await prisma.$transaction(async (tx) => {
    await tx.parcelaEmprestimo.update({
      where: { id: params.id },
      data: {
        status: 'PAGO',
        valorPago: calc.valorTotal,
        dataPagamento: new Date(dataPagamento),
        diasAtraso: calc.diasAtraso,
        baixadoPorId: admin.sub,
      },
    });

    // Se TODAS as parcelas estão pagas, marca empréstimo como QUITADO
    const todasPagas = parcela.emprestimo.parcelas.every(
      (p) => p.id === parcela.id || p.status === 'PAGO',
    );
    if (todasPagas) {
      await tx.emprestimo.update({
        where: { id: parcela.emprestimoId },
        data: { status: 'QUITADO' },
      });
    }
  });

  await registrarAuditoria({
    categoria: AUDIT.PAGAMENTO_BAIXA,
    acao: `Baixou parcela ${parcela.numero} do empréstimo de ${parcela.emprestimo.usuario.nomeCompleto}`,
    usuarioId: admin.sub,
    metadata: {
      parcelaId: parcela.id,
      emprestimoId: parcela.emprestimoId,
      valorTotal: calc.valorTotal,
    },
  });

  return NextResponse.json({ ok: true, calculo: calc });
});
