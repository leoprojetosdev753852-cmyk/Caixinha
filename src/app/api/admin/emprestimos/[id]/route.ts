import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';
import { editarEmprestimoSchema } from '@/shared';

interface Ctx {
  params: { id: string };
}

// GET = pegar emprestimo COM historico
export const GET = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const emp = await prisma.emprestimo.findUnique({
    where: { id: params.id },
    include: {
      parcelas: { orderBy: { numero: 'asc' } },
      pagamentos: { orderBy: { dataPagamento: 'desc' } },
    },
  });

  if (!emp) return errorResponse('Empréstimo não encontrado', 404, 'NOT_FOUND');
  return NextResponse.json(emp);
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = editarEmprestimoSchema.parse(body);

  const emp = await prisma.emprestimo.findUnique({ where: { id: params.id } });
  if (!emp) return errorResponse('Empréstimo não encontrado', 404, 'NOT_FOUND');

  if (emp.status === 'CANCELADO' || emp.status === 'QUITADO') {
    return errorResponse('Não é possível editar empréstimo finalizado', 400, 'FINAL_STATUS');
  }

  const updateData: any = {};
  if (data.nomeDevedor !== undefined) updateData.nomeDevedor = data.nomeDevedor.trim();
  if (data.pixDevedor !== undefined) updateData.pixDevedor = data.pixDevedor?.trim() || null;
  if (data.observacao !== undefined) updateData.observacao = data.observacao?.trim() || null;
  if (data.valorOriginal !== undefined) updateData.valorOriginal = data.valorOriginal;
  if (data.percentualJuros !== undefined) updateData.percentualJuros = data.percentualJuros;
  if (data.percentualJurosAtraso !== undefined)
    updateData.percentualJurosAtraso = data.percentualJurosAtraso;
  if (data.dataVencimento !== undefined) {
    updateData.dataVencimento = data.dataVencimento ? new Date(data.dataVencimento) : null;
  }

  const atualizado = await prisma.emprestimo.update({
    where: { id: params.id },
    data: updateData,
  });

  await registrarAuditoria({
    categoria: AUDIT.EMPRESTIMO_CRIADO,
    acao: `Editou empréstimo de ${atualizado.nomeDevedor}`,
    usuarioId: admin.sub,
    metadata: { emprestimoId: emp.id, mudancas: Object.keys(updateData) },
  });

  return NextResponse.json({ ok: true, emprestimo: atualizado });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const emp = await prisma.emprestimo.findUnique({ where: { id: params.id } });
  if (!emp) return errorResponse('Empréstimo não encontrado', 404, 'NOT_FOUND');

  if (emp.status === 'ATIVO') {
    await prisma.emprestimo.delete({ where: { id: params.id } });

    await registrarAuditoria({
      categoria: AUDIT.EMPRESTIMO_CRIADO,
      acao: `Excluiu empréstimo de ${emp.nomeDevedor}`,
      usuarioId: admin.sub,
      metadata: { emprestimoId: emp.id, acao: 'delete' },
    });

    return NextResponse.json({ ok: true, acao: 'deleted' });
  }

  await prisma.emprestimo.update({
    where: { id: params.id },
    data: { status: 'CANCELADO' },
  });

  await registrarAuditoria({
    categoria: AUDIT.EMPRESTIMO_CRIADO,
    acao: `Cancelou empréstimo de ${emp.nomeDevedor}`,
    usuarioId: admin.sub,
    metadata: { emprestimoId: emp.id, acao: 'cancel' },
  });

  return NextResponse.json({ ok: true, acao: 'cancelled' });
});
