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
      emprestimo: true,
    },
  });

  if (!parcela) {
    return errorResponse('Parcela nao encontrada', 404, 'NOT_FOUND');
  }
  if (parcela.status === 'PAGO') {
    return errorResponse('Parcela ja foi paga', 400, 'JA_PAGA');
  }

  const calc = calcularParcela({
    valorDevido: parcela.valorDevido,
    percentualJurosAtraso: Number(parcela.emprestimo.percentualJurosAtraso),
    dataVencimento: parcela.dataVencimento,
    dataReferencia: new Date(dataPagamento),
  });

  // Atualiza parcela
  await prisma.parcelaEmprestimo.update({
    where: { id: params.id },
    data: {
      status: 'PAGO',
      valorPago: calc.valorTotal,
      dataPagamento: new Date(dataPagamento),
      diasAtraso: calc.diasAtraso,
      baixadoPorId: admin.sub,
    },
  });

  // Verifica se todas as parcelas foram pagas para marcar emprestimo como QUITADO
  const parcelasRestantes = await prisma.parcelaEmprestimo.count({
    where: {
      emprestimoId: parcela.emprestimoId,
      status: { not: 'PAGO' },
    },
  });

  if (parcelasRestantes === 0) {
    await prisma.emprestimo.update({
      where: { id: parcela.emprestimoId },
      data: {
        status: 'QUITADO',
        dataPagamento: new Date(dataPagamento),
      },
    });
  }

  await registrarAuditoria({
    categoria: AUDIT.PAGAMENTO_BAIXA,
    acao: `Baixou parcela ${parcela.numero} do emprestimo de ${parcela.emprestimo.nomeDevedor}`,
    usuarioId: admin.sub,
    metadata: {
      parcelaId: parcela.id,
      emprestimoId: parcela.emprestimoId,
      valorTotal: calc.valorTotal,
      diasAtraso: calc.diasAtraso,
    },
  });

  return NextResponse.json({ ok: true, calculo: calc, emprestimoQuitado: parcelasRestantes === 0 });
});