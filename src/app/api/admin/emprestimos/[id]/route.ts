import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';

interface Ctx {
  params: { id: string };
}

export const GET = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const emp = await prisma.emprestimo.findUnique({
    where: { id: params.id },
    include: {
      usuario: { select: { id: true, nomeCompleto: true, cpf: true, chavePix: true, tipoChavePix: true } },
      parcelas: { orderBy: { numero: 'asc' } },
    },
  });

  if (!emp) return errorResponse('Empréstimo não encontrado', 404, 'NOT_FOUND');
  return NextResponse.json(emp);
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  await requireAdmin(req.headers.get('authorization'));

  const emp = await prisma.emprestimo.findUnique({ where: { id: params.id } });
  if (!emp) return errorResponse('Empréstimo não encontrado', 404, 'NOT_FOUND');
  if (emp.status === 'QUITADO') {
    return errorResponse('Empréstimo quitado não pode ser excluído', 400);
  }

  await prisma.emprestimo.update({
    where: { id: params.id },
    data: { status: 'CANCELADO' },
  });
  return NextResponse.json({ ok: true });
});
