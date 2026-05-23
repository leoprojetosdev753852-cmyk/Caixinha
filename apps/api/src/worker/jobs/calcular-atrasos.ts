import { prisma } from '@caixinhas/database';

export async function calcularAtrasos() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const result = await prisma.emprestimo.updateMany({
    where: {
      status: 'ATIVO',
      dataVencimento: { lt: hoje },
    },
    data: { status: 'ATRASADO' },
  });

  return { emprestimosAtualizados: result.count };
}
