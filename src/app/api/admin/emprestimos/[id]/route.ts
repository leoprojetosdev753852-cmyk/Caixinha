import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

interface Ctx {
  params: { id: string };
}

export const GET = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const emp = await prisma.emprestimo.findUnique({
    where: { id: params.id },
    include: {
      parcelas: { orderBy: { numero: 'asc' } },
    },
  });

  if (!emp) return errorResponse('Empréstimo não encontrado', 404, 'NOT_FOUND');
  return NextResponse.json(emp);
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
