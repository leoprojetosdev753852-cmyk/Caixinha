import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { criarUsuarioSchema, listarUsuariosQuerySchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { registrarAuditoria, AUDIT } from '@/lib/audit';

export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin(req.headers.get('authorization'));

  const { searchParams } = new URL(req.url);
  const { busca, apenas } = listarUsuariosQuerySchema.parse({
    busca: searchParams.get('busca') ?? undefined,
    apenas: searchParams.get('apenas') ?? 'ativos',
  });

  const where: any = { role: 'USER' };

  if (apenas === 'ativos') where.ativo = true;
  else if (apenas === 'inativos') where.ativo = false;

  if (busca) {
    where.OR = [
      { nomeCompleto: { contains: busca, mode: 'insensitive' } },
      { cpf: { contains: busca.replace(/\D/g, '') } },
    ];
  }

  const usuarios = await prisma.usuario.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      nomeCompleto: true,
      cpf: true,
      ativo: true,
      perfilCompleto: true,
      tipoChavePix: true,
      chavePix: true,
      criadoEm: true,
    },
  });

  return NextResponse.json({ usuarios });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const admin = await requireAdmin(req.headers.get('authorization'));

  const body = await req.json();
  const { nomeCompleto, cpf } = criarUsuarioSchema.parse(body);

  const existente = await prisma.usuario.findUnique({ where: { cpf } });
  if (existente) {
    return errorResponse('Já existe um usuário com este CPF', 409, 'DUPLICATE_CPF');
  }

  const novo = await prisma.usuario.create({
    data: {
      nomeCompleto,
      cpf,
      role: 'USER',
      perfilCompleto: false,
      ativo: true,
      criadoPorId: admin.sub,
    },
    select: {
      id: true,
      nomeCompleto: true,
      cpf: true,
      ativo: true,
      perfilCompleto: true,
      criadoEm: true,
    },
  });

  await registrarAuditoria({
    categoria: AUDIT.USUARIO_CRIADO,
    acao: `Admin criou usuário ${novo.nomeCompleto} (CPF ${novo.cpf})`,
    usuarioId: admin.sub,
    metadata: { usuarioCriadoId: novo.id },
  });

  return NextResponse.json({ usuario: novo }, { status: 201 });
});
