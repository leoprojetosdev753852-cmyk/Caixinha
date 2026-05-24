import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

interface Ctx {
  params: { id: string };
}

/**
 * Ativa a caixinha. Sistema gera pagamentos automaticamente:
 * - Quantidade de parcelas = quantidade de pontos
 * - Cada parcela vence no diaPagamento de cada mes consecutivo
 * - Data inicial = primeira dataContemplacao definida (ou hoje + 1 mes se nenhuma)
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

  // Valida que TODOS os pontos têm cotas que somam o valor do ponto
  const pontosIncompletos = caixinha.pontos.filter((p) => {
    const soma = p.cotas.reduce((acc, c) => acc + c.valor, 0);
    return soma !== p.valor || p.cotas.length === 0;
  });

  if (pontosIncompletos.length > 0) {
    return errorResponse(
      `${pontosIncompletos.length} ponto(s) com cotas incompletas. Todos os pontos precisam ter cotistas que somam o valor do ponto.`,
      400,
      'PONTOS_INCOMPLETOS',
    );
  }

  // Determina mes inicial: primeira dataContemplacao definida, ou proximo mes
  let mesInicial: Date;
  const primeiraContemplacao = caixinha.pontos.find((p) => p.dataContemplacao)?.dataContemplacao;
  if (primeiraContemplacao) {
    mesInicial = new Date(primeiraContemplacao);
  } else {
    mesInicial = new Date();
    mesInicial.setMonth(mesInicial.getMonth() + 1);
  }

  // Gera N datas de vencimento (1 por ponto = duração total)
  const totalParcelas = caixinha.pontos.length;
  const datasParcelas: Date[] = [];
  for (let i = 0; i < totalParcelas; i++) {
    const data = new Date(mesInicial.getFullYear(), mesInicial.getMonth() + i, caixinha.diaPagamento);
    datasParcelas.push(data);
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

  // Define data de contemplação dos pontos que não têm: ponto 1 = mes 1, ponto 2 = mes 2, etc
  const pontosSemData = caixinha.pontos
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !p.dataContemplacao);

  await prisma.$transaction(async (tx) => {
    // Atualiza data de contemplação dos pontos
    for (const { p, idx } of pontosSemData) {
      await tx.pontoCaixinha.update({
        where: { id: p.id },
        data: { dataContemplacao: datasParcelas[idx] },
      });
    }

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

  return NextResponse.json({ ok: true, pagamentosGerados: operacoes.length, totalParcelas });
});
