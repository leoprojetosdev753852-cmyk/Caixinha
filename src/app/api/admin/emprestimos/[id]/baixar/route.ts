import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { baixarEmprestimoSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';
import { calcularEmprestimoAVista, calcularSoJuros } from '@/lib/calculadora';

interface Ctx {
  params: { id: string };
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = baixarEmprestimoSchema.parse(body);

  const emp = await prisma.emprestimo.findUnique({
    where: { id: params.id },
  });

  if (!emp) return errorResponse('Empréstimo não encontrado', 404, 'NOT_FOUND');
  if (emp.tipo !== 'A_VISTA') {
    return errorResponse('Use baixa por parcela em empréstimos parcelados', 400);
  }
  if (emp.status === 'QUITADO') {
    return errorResponse('Empréstimo já está quitado', 400);
  }
  if (emp.status === 'CANCELADO') {
    return errorResponse('Empréstimo está cancelado', 400);
  }
  if (!emp.dataVencimento) {
    return errorResponse('Empréstimo sem data de vencimento', 500);
  }

  const dataPag = new Date(data.dataPagamento);
  const calc = calcularEmprestimoAVista({
    valorOriginal: emp.valorOriginal,
    percentualJuros: Number(emp.percentualJuros),
    percentualJurosAtraso: Number(emp.percentualJurosAtraso),
    dataVencimento: emp.dataVencimento,
    dataReferencia: dataPag,
  });

  // --- TIPO 1: INTEGRAL ---
  if (data.tipo === 'INTEGRAL') {
    await prisma.$transaction([
      prisma.emprestimo.update({
        where: { id: params.id },
        data: {
          status: 'QUITADO',
          valorPago: { increment: calc.valorTotal },
          dataPagamento: dataPag,
          diasAtraso: calc.diasAtraso,
        },
      }),
      prisma.pagamentoEmprestimo.create({
        data: {
          emprestimoId: params.id,
          valorPago: calc.valorTotal,
          valorJuros: calc.valorJuros + calc.valorJurosAtraso,
          valorCapital: emp.valorOriginal,
          dataPagamento: dataPag,
          tipo: 'INTEGRAL',
          observacao: data.observacao,
          registradoPorId: admin.sub,
        },
      }),
    ]);

    await registrarAuditoria({
      categoria: AUDIT.EMPRESTIMO_BAIXA,
      acao: `Quitou empréstimo de ${emp.nomeDevedor}`,
      usuarioId: admin.sub,
      metadata: { emprestimoId: emp.id, tipo: 'INTEGRAL', valor: calc.valorTotal },
    });

    return NextResponse.json({ ok: true, tipo: 'INTEGRAL', calculo: calc });
  }

  // --- TIPO 2: SÓ JUROS + RENOVAR ---
  if (data.tipo === 'SO_JUROS_RENOVOU') {
    const calcJuros = calcularSoJuros({
      valorOriginal: emp.valorOriginal,
      percentualJuros: Number(emp.percentualJuros),
      percentualJurosAtraso: Number(emp.percentualJurosAtraso),
      dataVencimento: emp.dataVencimento,
      dataReferencia: dataPag,
    });

    const dias = data.diasRenovacao ?? 30;
    const novoVenc = new Date(dataPag);
    novoVenc.setDate(novoVenc.getDate() + dias);

    await prisma.$transaction([
      prisma.emprestimo.update({
        where: { id: params.id },
        data: {
          status: 'ATIVO',
          valorPago: { increment: calcJuros.totalJuros },
          dataVencimento: novoVenc,
          diasAtraso: 0,
        },
      }),
      prisma.pagamentoEmprestimo.create({
        data: {
          emprestimoId: params.id,
          valorPago: calcJuros.totalJuros,
          valorJuros: calcJuros.totalJuros,
          valorCapital: 0,
          dataPagamento: dataPag,
          tipo: 'SO_JUROS_RENOVOU',
          observacao: data.observacao,
          novaDataVencimento: novoVenc,
          registradoPorId: admin.sub,
        },
      }),
    ]);

    await registrarAuditoria({
      categoria: AUDIT.EMPRESTIMO_BAIXA,
      acao: `Renovou empréstimo de ${emp.nomeDevedor} por ${dias} dias (pagou só juros)`,
      usuarioId: admin.sub,
      metadata: {
        emprestimoId: emp.id,
        tipo: 'SO_JUROS_RENOVOU',
        juros: calcJuros.totalJuros,
        novaData: novoVenc.toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      tipo: 'SO_JUROS_RENOVOU',
      juros: calcJuros.totalJuros,
      novaDataVencimento: novoVenc,
    });
  }

  // --- TIPO 3: PARCIAL ---
  if (data.tipo === 'PARCIAL') {
    const valor = data.valorPago!;

    await prisma.$transaction([
      prisma.emprestimo.update({
        where: { id: params.id },
        data: {
          valorPago: { increment: valor },
          // Status fica ATIVO, sem mexer em vencimento
        },
      }),
      prisma.pagamentoEmprestimo.create({
        data: {
          emprestimoId: params.id,
          valorPago: valor,
          valorJuros: 0,
          valorCapital: valor,
          dataPagamento: dataPag,
          tipo: 'PARCIAL',
          observacao: data.observacao,
          registradoPorId: admin.sub,
        },
      }),
    ]);

    await registrarAuditoria({
      categoria: AUDIT.EMPRESTIMO_BAIXA,
      acao: `Registrou pagamento parcial de ${emp.nomeDevedor}`,
      usuarioId: admin.sub,
      metadata: { emprestimoId: emp.id, tipo: 'PARCIAL', valor },
    });

    return NextResponse.json({ ok: true, tipo: 'PARCIAL', valor });
  }

  return errorResponse('Tipo de pagamento inválido', 400);
});
