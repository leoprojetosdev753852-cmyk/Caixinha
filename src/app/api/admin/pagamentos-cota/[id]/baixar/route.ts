import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { baixarPagamentoSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

interface Ctx {
  params: { id: string };
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const { dataPagamento, observacao } = baixarPagamentoSchema.parse(body);

  const pag = await prisma.pagamentoCota.findUnique({
    where: { id: params.id },
    include: {
      cota: {
        include: {
          ponto: { include: { caixinha: true } },
          usuario: { select: { nomeCompleto: true } },
        },
      },
    },
  });

  if (!pag) return errorResponse('Pagamento não encontrado', 404, 'NOT_FOUND');
  if (pag.status === 'PAGO') {
    return errorResponse('Pagamento já está pago', 400, 'ALREADY_PAID');
  }

  await prisma.pagamentoCota.update({
    where: { id: params.id },
    data: {
      status: 'PAGO',
      dataPagamento: new Date(dataPagamento),
      observacao,
      baixadoPorId: admin.sub,
    },
  });

  await registrarAuditoria({
    categoria: AUDIT.PAGAMENTO_BAIXA,
    acao: `Baixou pagamento de ${pag.cota.usuario.nomeCompleto} (caixinha "${pag.cota.ponto.caixinha.nome}")`,
    usuarioId: admin.sub,
    metadata: { pagamentoId: pag.id, caixinhaId: pag.cota.ponto.caixinhaId },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const pag = await prisma.pagamentoCota.findUnique({ where: { id: params.id } });
  if (!pag) return errorResponse('Pagamento não encontrado', 404, 'NOT_FOUND');
  if (pag.status !== 'PAGO') {
    return errorResponse('Pagamento não está pago', 400);
  }

  await prisma.pagamentoCota.update({
    where: { id: params.id },
    data: { status: 'PENDENTE', dataPagamento: null, baixadoPorId: null },
  });

  await registrarAuditoria({
    categoria: AUDIT.PAGAMENTO_BAIXA,
    acao: `Reverteu baixa do pagamento ${pag.id}`,
    usuarioId: admin.sub,
    metadata: { pagamentoId: pag.id },
  });

  return NextResponse.json({ ok: true });
});
