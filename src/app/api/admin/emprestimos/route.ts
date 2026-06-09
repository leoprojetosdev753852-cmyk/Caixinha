import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { criarEmprestimoSchema } from '@/shared';
import { withErrorHandling } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin(req.headers.get('authorization'));

  const emprestimos = await prisma.emprestimo.findMany({
    orderBy: { criadoEm: 'desc' },
    include: {
      parcelas: { orderBy: { numero: 'asc' } },
    },
  });

  return NextResponse.json({ emprestimos });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = criarEmprestimoSchema.parse(body);

  const emprestimo = await prisma.emprestimo.create({
    data: {
      nomeDevedor: data.nomeDevedor.trim(),
      pixDevedor: data.pixDevedor?.trim() || null,
      observacao: data.observacao?.trim() || null,
      tipo: data.tipo,
      valorOriginal: data.valorOriginal,
      percentualJuros: data.percentualJuros,
      percentualJurosAtraso: data.percentualJurosAtraso,
      dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
      status: 'ATIVO',
      parcelas:
        data.tipo === 'PARCELADO' && data.parcelas
          ? {
              create: data.parcelas.map((p) => ({
                numero: p.numero,
                valorDevido: p.valorDevido,
                dataVencimento: new Date(p.dataVencimento),
              })),
            }
          : undefined,
    },
    include: { parcelas: true },
  });

  await registrarAuditoria({
    categoria: AUDIT.EMPRESTIMO_CRIADO,
    acao: `Criou empréstimo ${data.tipo} para ${emprestimo.nomeDevedor}`,
    usuarioId: admin.sub,
    metadata: { emprestimoId: emprestimo.id, tipo: data.tipo, valor: data.valorOriginal },
  });

  return NextResponse.json({ emprestimo }, { status: 201 });
});
