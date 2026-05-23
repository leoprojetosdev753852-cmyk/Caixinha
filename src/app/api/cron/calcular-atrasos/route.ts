import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Endpoint chamado pelo GitHub Actions diariamente.
 * Proteção: header Authorization com CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (auth !== expected) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const result = await prisma.emprestimo.updateMany({
    where: { status: 'ATIVO', dataVencimento: { lt: hoje } },
    data: { status: 'ATRASADO' },
  });

  return NextResponse.json({
    ok: true,
    emprestimosAtualizados: result.count,
    timestamp: new Date().toISOString(),
  });
}
