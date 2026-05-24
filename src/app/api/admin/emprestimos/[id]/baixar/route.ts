import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { baixarEmprestimoAVistaSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';
import { calcularEmprestimoAVista } from '@/lib/calculadora';

interface Ctx {
  params: { id: string };
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const { dataPagamento, observacao } = baixarEmprestimoAVistaSchema.parse(body);

  const emp = await prisma.emprestimo.findUnique({
    where: { id: params.id },
    include: { usuario: { select: { nomeCompleto: true } } },
  });

  if (!emp) return errorResponse('Empréstimo não encontrado', 404, 'NOT_FOUND');
  if (emp.tipo !== 'A_VISTA') {
    return errorResponse('Empréstimo é parcelado; use baixa por parcela', 400);
  }
  if (emp.status === 'QUITADO') {
    return errorResponse('Empréstimo já está quitado', 400);
  }
  if (!emp.dataVencimento) {
    return errorResponse('Empréstimo sem data de vencimento', 500);
  }

  const calc = calcularEmprestimoAVista({
    valorOriginal: emp.valorOriginal,
    percentualJuros: Number(emp.percentualJuros),
    percentualJurosAtraso: Number(emp.percentualJurosAtraso),
    dataVencimento: emp.dataVencimento,
    dataReferencia: new Date(dataPagamento),
  });

  await prisma.emprestimo.update({
    where: { id: params.id },
    data: {
      status: 'QUITADO',
      valorPago: calc.valorTotal,
      dataPagamento: new Date(dataPagamento),
      diasAtraso: calc.diasAtraso,
      observacao: observacao ?? emp.observacao,
    },
  });

  await registrarAuditoria({
    categoria: AUDIT.EMPRESTIMO_BAIXA,
    acao: `Baixou empréstimo à vista de ${emp.usuario.nomeCompleto}`,
    usuarioId: admin.sub,
    metadata: { emprestimoId: emp.id, valorTotal: calc.valorTotal, diasAtraso: calc.diasAtraso },
  });

  return NextResponse.json({ ok: true, calculo: calc });
});
