import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { limparCPF, validarCPF } from '@/shared';
import { registrarAuditoria, AUDIT } from '@/lib/audit';
import { createSession, getRefreshCookieOptions } from '@/lib/auth';

interface Body {
  cpf?: string;
  convite?: string;
  senha: string;
  confirmacaoSenha: string;
  tipoChavePix: 'CPF' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  chavePix: string;
  aceiteTermos: boolean;
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = (await req.json()) as Body;

  if (!body.aceiteTermos) {
    return errorResponse('Aceite os termos', 400, 'TERMS_REQUIRED');
  }
  if (!body.senha || body.senha.length < 8) {
    return errorResponse('Senha deve ter no minimo 8 caracteres', 400, 'INVALID_PASSWORD');
  }
  if (body.senha !== body.confirmacaoSenha) {
    return errorResponse('Senhas nao conferem', 400, 'PASSWORD_MISMATCH');
  }
  if (!body.chavePix || body.chavePix.trim().length === 0) {
    return errorResponse('Chave PIX obrigatoria', 400, 'MISSING_PIX');
  }

  let usuario: {
    id: string;
    cpf: string | null;
    perfilCompleto: boolean;
    senhaHash: string | null;
    ativo: boolean;
    role: 'ADMIN' | 'USER';
    nomeCompleto: string;
  } | null = null;

  // Caminho 1: convite (id direto)
  if (body.convite) {
    usuario = await prisma.usuario.findUnique({
      where: { id: body.convite },
      select: {
        id: true,
        cpf: true,
        perfilCompleto: true,
        senhaHash: true,
        ativo: true,
        role: true,
        nomeCompleto: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      return errorResponse('Convite invalido', 404, 'INVALID_INVITE');
    }

    if (!body.cpf) {
      return errorResponse('CPF obrigatorio', 400, 'MISSING_CPF');
    }
    const cpfLimpo = limparCPF(body.cpf);
    if (cpfLimpo.length !== 11 || !validarCPF(cpfLimpo)) {
      return errorResponse('CPF invalido', 400, 'INVALID_CPF');
    }

    if (usuario.cpf !== cpfLimpo) {
      const conflito = await prisma.usuario.findUnique({ where: { cpf: cpfLimpo } });
      if (conflito && conflito.id !== usuario.id) {
        return errorResponse('Este CPF ja esta em uso', 409, 'DUPLICATE_CPF');
      }
    }

    if (usuario.cpf !== cpfLimpo) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { cpf: cpfLimpo },
      });
      usuario.cpf = cpfLimpo;
    }
  } else {
    if (!body.cpf) {
      return errorResponse('CPF obrigatorio', 400, 'MISSING_CPF');
    }
    const cpfLimpo = limparCPF(body.cpf);
    if (cpfLimpo.length !== 11 || !validarCPF(cpfLimpo)) {
      return errorResponse('CPF invalido', 400, 'INVALID_CPF');
    }

    usuario = await prisma.usuario.findUnique({
      where: { cpf: cpfLimpo },
      select: {
        id: true,
        cpf: true,
        perfilCompleto: true,
        senhaHash: true,
        ativo: true,
        role: true,
        nomeCompleto: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      return errorResponse('Usuario nao encontrado', 404, 'NOT_FOUND');
    }
  }

  if (usuario.perfilCompleto) {
    return errorResponse('Cadastro ja foi finalizado anteriormente', 400, 'ALREADY_COMPLETE');
  }

  if (!usuario.cpf) {
    return errorResponse('CPF obrigatorio', 400, 'MISSING_CPF');
  }

  const senhaHash = await bcrypt.hash(body.senha, 10);

  const atualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      senhaHash,
      tipoChavePix: body.tipoChavePix,
      chavePix: body.chavePix.trim(),
      perfilCompleto: true,
    },
    select: { id: true, cpf: true, nomeCompleto: true, role: true },
  });

  if (!atualizado.cpf) {
    return errorResponse('Erro ao salvar CPF', 500, 'INTERNAL');
  }

  await registrarAuditoria({
    categoria: AUDIT.USUARIO_ATUALIZADO,
    acao: `Usuario ${atualizado.nomeCompleto} concluiu primeiro acesso`,
    usuarioId: atualizado.id,
  });

  // Login automatico
  const { accessToken, refreshToken } = await createSession(
    atualizado.id,
    atualizado.cpf,
    atualizado.role,
  );

  const res = NextResponse.json({
    accessToken,
    user: {
      id: atualizado.id,
      cpf: atualizado.cpf,
      nomeCompleto: atualizado.nomeCompleto,
      role: atualizado.role,
    },
  });

  res.cookies.set('refreshToken', refreshToken, getRefreshCookieOptions());
  return res;
});