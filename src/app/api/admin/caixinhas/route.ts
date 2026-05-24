import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { criarCaixinhaSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin(req.headers.get('authorization'));

  const caixinhas = await prisma.caixinha.findMany({
    orderBy: { criadoEm: 'desc' },
    include: {
      pontos: {
        select: {
          id: true,
          numero: true,
          valor: true,
          dataContemplacao: true,
          cotas: {
            select: {
              id: true,
              valor: true,
              usuario: { select: { id: true, nomeCompleto: true } },
              pagamentos: { select: { id: true, status: true, valorDevido: true } },
            },
          },
        },
        orderBy: { numero: 'asc' },
      },
    },
  });

  // Calcula stats por caixinha
  const result = caixinhas.map((c) => {
    let valorTotal = 0;
    let pontosOcupados = 0;
    let pontosVagos = 0;
    let pagamentosPendentes = 0;
    let pagamentosPagos = 0;

    for (const p of c.pontos) {
      valorTotal += p.valor;
      const valorCotas = p.cotas.reduce((acc, ct) => acc + ct.valor, 0);
      if (valorCotas >= p.valor) pontosOcupados++;
      else pontosVagos++;

      for (const cota of p.cotas) {
        for (const pag of cota.pagamentos) {
          if (pag.status === 'PAGO') pagamentosPagos++;
          else pagamentosPendentes++;
        }
      }
    }

    return {
      id: c.id,
      nome: c.nome,
      status: c.status,
      observacao: c.observacao,
      dataAtivacao: c.dataAtivacao,
      criadoEm: c.criadoEm,
      valorTotal,
      quantidadePontos: c.pontos.length,
      pontosOcupados,
      pontosVagos,
      pagamentosPendentes,
      pagamentosPagos,
    };
  });

  return NextResponse.json({ caixinhas: result });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = criarCaixinhaSchema.parse(body);

  // Valida números únicos
  const numeros = data.pontos.map((p) => p.numero);
  if (new Set(numeros).size !== numeros.length) {
    return errorResponse('Números de pontos duplicados', 400, 'INVALID_INPUT');
  }

  const caixinha = await prisma.caixinha.create({
    data: {
      nome: data.nome,
      observacao: data.observacao,
      status: 'RASCUNHO',
      pontos: {
        create: data.pontos.map((p) => ({
          numero: p.numero,
          valor: p.valor,
          dataContemplacao: p.dataContemplacao ? new Date(p.dataContemplacao) : null,
        })),
      },
    },
    include: { pontos: true },
  });

  await registrarAuditoria({
    categoria: AUDIT.CAIXINHA_CRIADA,
    acao: `Criou caixinha "${caixinha.nome}" com ${caixinha.pontos.length} pontos`,
    usuarioId: admin.sub,
    metadata: { caixinhaId: caixinha.id },
  });

  return NextResponse.json({ caixinha }, { status: 201 });
});
