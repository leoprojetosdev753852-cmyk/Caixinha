import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { criarEmprestimoSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin(req.headers.get('authorization'));

  const emprestimos = await prisma.emprestimo.findMany({
    orderBy: { criadoEm: 'desc' },
    include: {
      usuario: { select: { id: true, nomeCompleto: true, cpf: true } },
      parcelas: { orderBy: { numero: 'asc' } },
    },
  });

  return NextResponse.json({ emprestimos });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = criarEmprestimoSchema.parse(body);

  const usuario = await prisma.usuario.findUnique({ where: { id: data.usuarioId } });
  if (!usuario || !usuario.ativo) {
    return errorResponse('Usuário inválido', 400, 'INVALID_USER');
  }

  const emprestimo = await prisma.emprestimo.create({
    data: {
      usuarioId: data.usuarioId,
      tipo: data.tipo,
      valorOriginal: data.valorOriginal,
      percentualJuros: data.percentualJuros,
      percentualJurosAtraso: data.percentualJurosAtraso,
      observacao: data.observacao,
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
    include: { parcelas: true, usuario: { select: { nomeCompleto: true } } },
  });

  await registrarAuditoria({
    categoria: AUDIT.EMPRESTIMO_CRIADO,
    acao: `Criou empréstimo ${data.tipo} para ${emprestimo.usuario.nomeCompleto}`,
    usuarioId: admin.sub,
    metadata: { emprestimoId: emprestimo.id, tipo: data.tipo, valor: data.valorOriginal },
  });

  return NextResponse.json({ emprestimo }, { status: 201 });
});
