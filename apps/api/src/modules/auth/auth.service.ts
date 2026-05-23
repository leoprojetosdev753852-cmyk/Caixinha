import bcrypt from 'bcrypt';
import { prisma } from '@caixinhas/database';
import type { FastifyInstance } from 'fastify';
import type { LoginInput, CheckCpfInput, FirstAccessInput } from '@caixinhas/shared';
import { AppError } from '../../shared/errors/app-error';

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  async checkCpf({ cpf }: CheckCpfInput) {
    const usuario = await prisma.usuario.findUnique({
      where: { cpf },
      select: { id: true, perfilCompleto: true, ativo: true, senhaHash: true },
    });

    if (!usuario || !usuario.ativo) {
      return { existe: false, perfilCompleto: false, primeiroAcesso: false };
    }

    return {
      existe: true,
      perfilCompleto: usuario.perfilCompleto,
      primeiroAcesso: usuario.senhaHash === null,
    };
  }

  async login({ cpf, senha }: LoginInput) {
    const usuario = await prisma.usuario.findUnique({ where: { cpf } });

    if (!usuario || !usuario.ativo || !usuario.senhaHash) {
      throw AppError.unauthorized('CPF ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      throw AppError.unauthorized('CPF ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    return this.gerarTokens(usuario.id, usuario.cpf, usuario.role);
  }

  async firstAccess({ cpf, senha, tipoChavePix, chavePix }: FirstAccessInput) {
    const usuario = await prisma.usuario.findUnique({ where: { cpf } });

    if (!usuario || !usuario.ativo) {
      throw AppError.unauthorized('CPF não encontrado', 'CPF_NOT_FOUND');
    }

    if (usuario.senhaHash !== null) {
      throw AppError.conflict(
        'Este usuário já possui senha. Faça login normalmente.',
        'ALREADY_REGISTERED',
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash,
        tipoChavePix,
        chavePix,
        perfilCompleto: true,
      },
    });

    return this.gerarTokens(atualizado.id, atualizado.cpf, atualizado.role);
  }

  async refresh(refreshToken: string) {
    const tokenDb = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { usuario: true },
    });

    if (!tokenDb || tokenDb.revogado || tokenDb.expiraEm < new Date()) {
      throw AppError.unauthorized('Refresh token inválido', 'INVALID_REFRESH_TOKEN');
    }

    if (!tokenDb.usuario.ativo) {
      throw AppError.unauthorized('Usuário inativo', 'USER_INACTIVE');
    }

    await prisma.refreshToken.update({
      where: { id: tokenDb.id },
      data: { revogado: true },
    });

    return this.gerarTokens(tokenDb.usuario.id, tokenDb.usuario.cpf, tokenDb.usuario.role);
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revogado: true },
    });
  }

  private async gerarTokens(userId: string, cpf: string, role: 'ADMIN' | 'USER') {
    const accessToken = this.app.jwt.sign(
      { sub: userId, cpf, role },
      { expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m' },
    );

    const refreshToken = this.app.jwt.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d' },
    );

    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    await prisma.refreshToken.create({
      data: { token: refreshToken, usuarioId: userId, expiraEm },
    });

    return { accessToken, refreshToken, user: { id: userId, cpf, role } };
  }
}
