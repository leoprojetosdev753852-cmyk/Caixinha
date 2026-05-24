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

  const caixinha = await prisma.caixinha.findUnique({
    where: { id: params.id },
    include: {
      pontos: {
        orderBy: { numero: 'asc' },
        include: {
          cotas: {
            include: {
              usuario: { select: { id: true, nomeCompleto: true, cpf: true } },
              pagamentos: { orderBy: { dataVencimento: 'asc' } },
            },
          },
        },
      },
    },
  });

  if (!caixinha) return errorResponse('Caixinha não encontrada', 404, 'NOT_FOUND');

  return NextResponse.json(caixinha);
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const c = await prisma.caixinha.findUnique({ where: { id: params.id } });
  if (!c) return errorResponse('Caixinha não encontrada', 404, 'NOT_FOUND');

  if (c.status === 'RASCUNHO') {
    // Delete real (cascateia pontos, cotas, pagamentos)
    await prisma.caixinha.delete({ where: { id: params.id } });

    await registrarAuditoria({
      categoria: AUDIT.CAIXINHA_CRIADA,
      acao: `Excluiu caixinha rascunho "${c.nome}"`,
      usuarioId: admin.sub,
      metadata: { caixinhaId: c.id, acao: 'delete' },
    });

    return NextResponse.json({ ok: true, acao: 'deleted' });
  }

  // Cancela (preserva histórico)
  await prisma.caixinha.update({
    where: { id: params.id },
    data: { status: 'CANCELADA' },
  });

  await registrarAuditoria({
    categoria: AUDIT.CAIXINHA_CRIADA,
    acao: `Cancelou caixinha "${c.nome}"`,
    usuarioId: admin.sub,
    metadata: { caixinhaId: c.id, acao: 'cancel' },
  });

  return NextResponse.json({ ok: true, acao: 'cancelled' });
});
