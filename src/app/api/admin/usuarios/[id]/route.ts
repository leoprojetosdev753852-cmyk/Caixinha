import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { atualizarUsuarioAdminSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

interface RouteContext {
  params: { id: string };
}

export const GET = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await requireAdmin(req.headers.get('authorization'));

  const usuario = await prisma.usuario.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      nomeCompleto: true,
      cpf: true,
      ativo: true,
      role: true,
      perfilCompleto: true,
      tipoChavePix: true,
      chavePix: true,
      criadoEm: true,
      atualizadoEm: true,
    },
  });

  if (!usuario) return errorResponse('Usuário não encontrado', 404, 'NOT_FOUND');

  return NextResponse.json(usuario);
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const data = atualizarUsuarioAdminSchema.parse(body);

  const existente = await prisma.usuario.findUnique({ where: { id: params.id } });
  if (!existente) return errorResponse('Usuário não encontrado', 404, 'NOT_FOUND');
  if (existente.role === 'ADMIN') {
    return errorResponse('Não é possível editar outro admin por esta rota', 403, 'FORBIDDEN');
  }

  const atualizado = await prisma.usuario.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      nomeCompleto: true,
      cpf: true,
      ativo: true,
      perfilCompleto: true,
      tipoChavePix: true,
      chavePix: true,
    },
  });

  // Auditoria especial pra ativar/desativar
  if (data.ativo !== undefined && data.ativo !== existente.ativo) {
    await registrarAuditoria({
      categoria: data.ativo ? AUDIT.USUARIO_REATIVADO : AUDIT.USUARIO_DESATIVADO,
      acao: `${data.ativo ? 'Reativou' : 'Desativou'} usuário ${atualizado.nomeCompleto}`,
      usuarioId: admin.sub,
      metadata: { usuarioAfetadoId: atualizado.id },
    });
  } else {
    await registrarAuditoria({
      categoria: AUDIT.USUARIO_ATUALIZADO,
      acao: `Atualizou usuário ${atualizado.nomeCompleto}`,
      usuarioId: admin.sub,
      metadata: { usuarioAfetadoId: atualizado.id, alteracoes: data },
    });
  }

  return NextResponse.json(atualizado);
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const existente = await prisma.usuario.findUnique({ where: { id: params.id } });
  if (!existente) return errorResponse('Usuário não encontrado', 404, 'NOT_FOUND');
  if (existente.role === 'ADMIN') {
    return errorResponse('Não é possível remover admin', 403, 'FORBIDDEN');
  }

  // Soft delete
  const atualizado = await prisma.usuario.update({
    where: { id: params.id },
    data: { ativo: false },
  });

  await registrarAuditoria({
    categoria: AUDIT.USUARIO_DESATIVADO,
    acao: `Desativou usuário ${atualizado.nomeCompleto}`,
    usuarioId: admin.sub,
    metadata: { usuarioAfetadoId: atualizado.id },
  });

  return NextResponse.json({ ok: true });
});
