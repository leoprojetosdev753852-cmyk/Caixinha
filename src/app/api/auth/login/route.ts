import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { createSession, getRefreshCookieOptions } from '@/lib/auth';
import { loginSchema } from '@/shared';
import { withErrorHandling, errorResponse } from '@/lib/api-helpers';
import { limparCPF } from '@/shared';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { identificador, senha } = loginSchema.parse(body);

  // Tenta detectar: se tem 11 dígitos numéricos depois de limpar -> CPF; senão -> username
  const idLimpo = identificador.trim();
  const apenasDigitos = idLimpo.replace(/\D/g, '');
  const ehCpf = apenasDigitos.length === 11;

  const usuario = await prisma.usuario.findFirst({
    where: ehCpf
      ? { cpf: apenasDigitos }
      : { username: idLimpo.toLowerCase() },
  });

  if (!usuario || !usuario.ativo || !usuario.senhaHash) {
    return errorResponse('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) {
    return errorResponse('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  }

  // Para createSession, usa cpf real OU username como identificador alternativo
  const identidadeToken = usuario.cpf || usuario.username || usuario.id;

  const { accessToken, refreshToken } = await createSession(
    usuario.id,
    identidadeToken,
    usuario.role,
  );

  const response = NextResponse.json({
    accessToken,
    user: {
      id: usuario.id,
      cpf: usuario.cpf,
      username: usuario.username,
      role: usuario.role,
      nomeCompleto: usuario.nomeCompleto,
    },
  });

  response.cookies.set('refreshToken', refreshToken, getRefreshCookieOptions());
  return response;
});
