import { prisma } from './prisma';

export const AUDIT = {
  USUARIO_CRIADO: 'USUARIO_CRIADO',
  USUARIO_ATUALIZADO: 'USUARIO_ATUALIZADO',
  USUARIO_DESATIVADO: 'USUARIO_DESATIVADO',
  USUARIO_REATIVADO: 'USUARIO_REATIVADO',
  PIX_ATUALIZADO: 'PIX_ATUALIZADO',
  LOGIN_SUCESSO: 'LOGIN_SUCESSO',
  CAIXINHA_CRIADA: 'CAIXINHA_CRIADA',
  CAIXINHA_ATIVADA: 'CAIXINHA_ATIVADA',
  PAGAMENTO_BAIXA: 'PAGAMENTO_BAIXA',
  EMPRESTIMO_CRIADO: 'EMPRESTIMO_CRIADO',
  EMPRESTIMO_BAIXA: 'EMPRESTIMO_BAIXA',
} as const;

export type AuditCategory = (typeof AUDIT)[keyof typeof AUDIT];

interface AuditParams {
  categoria: AuditCategory;
  acao: string;
  usuarioId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export async function registrarAuditoria(params: AuditParams) {
  try {
    await prisma.auditoria.create({
      data: {
        categoria: params.categoria,
        acao: params.acao,
        usuarioId: params.usuarioId,
        metadata: (params.metadata as never) ?? undefined,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
      },
    });
  } catch (err) {
    // Não derruba a operação por causa de log
    console.error('Falha ao registrar auditoria:', err);
  }
}
