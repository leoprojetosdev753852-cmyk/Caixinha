import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { limparCPF, validarCPF } from '@/shared';
import { registrarAuditoria, AUDIT } from '@/lib/audit';
import { signTokens, setAuthCookies } from '@/lib/auth';

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
    return errorResponse('Senha deve ter no mínimo 8 caracteres', 400, 'INVALID_PASSWORD');
  }
  if (body.senha !== body.confirmacaoSenha) {
    return errorResponse('Senhas não conferem', 400, 'PASSWORD_MISMATCH');
  }
  if (!body.chavePix || body.chavePix.trim().length === 0) {
    return errorResponse('Chave PIX obrigatória', 400, 'MISSING_PIX');
  }

  let usuario: { id: string; cpf: string | null; perfilCompleto: boolean; senhaHash: string | null; ativo: boolean } | null = null;

  // Caminho 1: convite (id direto)
  if (body.convite) {
    usuario = await prisma.usuario.findUnique({
      where: { id: body.convite },
      select: { id: true, cpf: true, perfilCompleto: true, senhaHash: true, ativo: true },
    });

    if (!usuario || !usuario.ativo) {
      return errorResponse('Convite inválido', 404, 'INVALID_INVITE');
    }

    // Convite exige CPF
    if (!body.cpf) {
      return errorResponse('CPF obrigatório', 400, 'MISSING_CPF');
    }
    const cpfLimpo = limparCPF(body.cpf);
    if (cpfLimpo.length !== 11 || !validarCPF(cpfLimpo)) {
      return errorResponse('CPF inválido', 400, 'INVALID_CPF');
    }

    // Garante que o CPF não está em uso por outro usuário
    if (usuario.cpf !== cpfLimpo) {
      const conflito = await prisma.usuario.findUnique({ where: { cpf: cpfLimpo } });
      if (conflito && conflito.id !== usuario.id) {
        return errorResponse('Este CPF já está em uso', 409, 'DUPLICATE_CPF');
      }
    }

    // Atualiza CPF se diferente do atual
    if (usuario.cpf !== cpfLimpo) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { cpf: cpfLimpo },
      });
      usuario.cpf = cpfLimpo;
    }
  } else {
    // Caminho 2: CPF direto (usuario foi cadastrado com CPF)
    if (!body.cpf) {
      return errorResponse('CPF obrigatório', 400, 'MISSING_CPF');
    }
    const cpfLimpo = limparCPF(body.cpf);
    if (cpfLimpo.length !== 11 || !validarCPF(cpfLimpo)) {
      return errorResponse('CPF inválido', 400, 'INVALID_CPF');
    }

    usuario = await prisma.usuario.findUnique({
      where: { cpf: cpfLimpo },
      select: { id: true, cpf: true, perfilCompleto: true, senhaHash: true, ativo: true },
    });

    if (!usuario || !usuario.ativo) {
      return errorResponse('Usuário não encontrado', 404, 'NOT_FOUND');
    }
  }

  if (usuario.perfilCompleto) {
    return errorResponse('Cadastro já foi finalizado anteriormente', 400, 'ALREADY_COMPLETE');
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

  await registrarAuditoria({
    categoria: AUDIT.USUARIO_ATUALIZADO,
    acao: `Usuário ${atualizado.nomeCompleto} concluiu primeiro acesso`,
    usuarioId: atualizado.id,
  });

  // Login automático
  const { accessToken, refreshToken } = await signTokens(atualizado);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      usuarioId: atualizado.id,
      expiraEm: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const res = NextResponse.json({
    accessToken,
    user: {
      id: atualizado.id,
      cpf: atualizado.cpf,
      nomeCompleto: atualizado.nomeCompleto,
      role: atualizado.role,
    },
  });

  setAuthCookies(res, refreshToken);
  return res;
});
