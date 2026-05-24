import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

interface Ctx {
  params: { id: string };
}

/**
 * Ativa caixinha mesmo com pontos incompletos.
 * Pontos vazios ou parciais NAO geram pagamentos (ficam zerados ate admin adicionar cotistas).
 * Pontos completos geram pagamentos para cada data de contemplacao dos OUTROS pontos completos.
 *
 * Ajuste de regra: cada cotista paga em TODAS as datas de contemplacao definidas (de TODOS os pontos da caixinha).
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

  // Pontos vazios geram aviso mas nao bloqueiam
  const pontosComCotistas = caixinha.pontos.filter((p) => p.cotas.length > 0);

  if (pontosComCotistas.length === 0) {
    return errorResponse(
      'Pelo menos 1 ponto precisa ter cotistas pra ativar',
      400,
      'SEM_COTISTAS',
    );
  }

  // Datas = todas as datas de contemplacao definidas
  const datasParcelas = caixinha.pontos
    .map((p) => p.dataContemplacao)
    .filter((d): d is Date => d !== null);

  if (datasParcelas.length === 0) {
    return errorResponse('Pontos sem data de contemplação', 400, 'SEM_DATAS');
  }

  // Pra cada cota dos pontos com cotistas, cria pagamentos pra cada data
  const operacoes: Array<{
    cotaId: string;
    dataVencimento: Date;
    valorDevido: number;
  }> = [];

  for (const ponto of pontosComCotistas) {
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
    metadata: {
      caixinhaId: caixinha.id,
      pagamentosGerados: operacoes.length,
      pontosComCotistas: pontosComCotistas.length,
      pontosVazios: caixinha.pontos.length - pontosComCotistas.length,
    },
  });

  return NextResponse.json({
    ok: true,
    pagamentosGerados: operacoes.length,
    pontosComCotistas: pontosComCotistas.length,
    pontosVazios: caixinha.pontos.length - pontosComCotistas.length,
  });
});
