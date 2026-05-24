import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ativarCaixinhaSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

interface Ctx {
  params: { id: string };
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = ativarCaixinhaSchema.parse(body);

  const caixinha = await prisma.caixinha.findUnique({
    where: { id: params.id },
    include: {
      pontos: {
        include: { cotas: true },
      },
    },
  });

  if (!caixinha) return errorResponse('Caixinha não encontrada', 404, 'NOT_FOUND');
  if (caixinha.status !== 'RASCUNHO') {
    return errorResponse('Caixinha já foi ativada', 400, 'CAIXINHA_JA_ATIVA');
  }

  // Valida que tem pelo menos 1 ponto totalmente coberto
  const pontosCobertos = caixinha.pontos.filter((p) => {
    const soma = p.cotas.reduce((acc, c) => acc + c.valor, 0);
    return soma === p.valor && p.cotas.length > 0;
  });

  if (pontosCobertos.length === 0) {
    return errorResponse(
      'Pelo menos 1 ponto precisa estar com cotas completas pra ativar',
      400,
      'SEM_PONTOS_COMPLETOS',
    );
  }

  // Gera pagamentos: para cada cota dos pontos cobertos, cria N pagamentos (N = data.parcelas.length)
  // Cada pagamento tem valor = cota.valor (mesmo valor todo mês)
  // dataVencimento vem do array data.parcelas
  const operacoes: Array<{
    cotaId: string;
    dataVencimento: Date;
    valorDevido: number;
  }> = [];

  for (const ponto of pontosCobertos) {
    for (const cota of ponto.cotas) {
      for (const parc of data.parcelas) {
        operacoes.push({
          cotaId: cota.id,
          dataVencimento: new Date(parc.dataVencimento),
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
