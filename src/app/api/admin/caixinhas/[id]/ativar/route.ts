import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

interface Ctx {
  params: { id: string };
}

/**
 * Ativa caixinha. Cada cotista paga em todas as datas de contemplação dos pontos da caixinha.
 * Ex: Caixinha de 10 pontos com datas jan/2025, fev/2025, ..., out/2025.
 * Cada cotista gera 10 pagamentos, um para cada dessas datas.
 */
export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const caixinha = await prisma.caixinha.findUnique({
    where: { id: params.id },
    include: {
      pontos: {
        include: { cotas: true },
        orderBy: { numero: 'asc' },
      },
    },
  });

  if (!caixinha) return errorResponse('Caixinha não encontrada', 404, 'NOT_FOUND');
  if (caixinha.status !== 'RASCUNHO') {
    return errorResponse('Caixinha já foi ativada', 400, 'CAIXINHA_JA_ATIVA');
  }

  // Valida pontos completos
  const pontosIncompletos = caixinha.pontos.filter((p) => {
    const soma = p.cotas.reduce((acc, c) => acc + c.valor, 0);
    return soma !== p.valor || p.cotas.length === 0;
  });

  if (pontosIncompletos.length > 0) {
    return errorResponse(
      `${pontosIncompletos.length} ponto(s) com cotas incompletas`,
      400,
      'PONTOS_INCOMPLETOS',
    );
  }

  // Datas de vencimento = data de contemplação de cada ponto
  const datasParcelas = caixinha.pontos
    .map((p) => p.dataContemplacao)
    .filter((d): d is Date => d !== null);

  if (datasParcelas.length === 0) {
    return errorResponse('Pontos sem data de contemplação', 400, 'SEM_DATAS');
  }

  // Para cada cota, cria N pagamentos (1 por mês)
  const operacoes: Array<{
    cotaId: string;
    dataVencimento: Date;
    valorDevido: number;
  }> = [];

  for (const ponto of caixinha.pontos) {
    for (const cota of ponto.cotas) {
      for (const dataVenc of datasParcelas) {
        operacoes.push({
          cotaId: cota.id,
          dataVencimento: dataVenc,
          valorDevido: cota.valor,
        });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.caixinha.update({
      where: { id: params.id },
      data: { status: 'ATIVA', dataAtivacao: new Date() },
    });

    if (operacoes.length > 0) {
      await tx.pagamentoCota.createMany({ data: operacoes });
    }
  });

  await registrarAuditoria({
    categoria: AUDIT.CAIXINHA_ATIVADA,
    acao: `Ativou caixinha "${caixinha.nome}" com ${operacoes.length} pagamentos`,
    usuarioId: admin.sub,
    metadata: { caixinhaId: caixinha.id, pagamentosGerados: operacoes.length },
  });

  return NextResponse.json({ ok: true, pagamentosGerados: operacoes.length });
});
