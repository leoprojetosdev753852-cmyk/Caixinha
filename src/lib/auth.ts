import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_DAYS = 7;

export interface JwtPayload {
  sub: string;
  cpf: string;
  role: 'ADMIN' | 'USER';
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return await new SignJWT({ cpf: payload.cpf, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(accessSecret);
}

export async function signRefreshToken(userId: string): Promise<string> {
  return await new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_EXPIRES_DAYS}d`)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return {
      sub: payload.sub as string,
      cpf: payload.cpf as string,
      role: payload.role as 'ADMIN' | 'USER',
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}

/**
 * Cria par de tokens, salva refresh no banco e retorna tokens.
 */
export async function createSession(userId: string, cpf: string, role: 'ADMIN' | 'USER') {
  const accessToken = await signAccessToken({ sub: userId, cpf, role });
  const refreshToken = await signRefreshToken(userId);

  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + REFRESH_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: { token: refreshToken, usuarioId: userId, expiraEm },
  });

  return { accessToken, refreshToken };
}

/**
 * Cookie options pro refresh token (httpOnly, secure em prod).
 */
export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: REFRESH_EXPIRES_DAYS * 24 * 60 * 60,
  };
}

/**
 * LÃª token Bearer do header Authorization e retorna user atual.
 * Retorna null se nÃ£o tiver token ou for invÃ¡lido.
 */
export async function getCurrentUser(authHeader: string | null): Promise<JwtPayload | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return verifyAccessToken(token);
}

/**
 * Helper para rotas que exigem auth.
 * LanÃ§a erro 401 se nÃ£o autenticado.
 */
export async function requireAuth(authHeader: string | null): Promise<JwtPayload> {
  const user = await getCurrentUser(authHeader);
  if (!user) {
    throw new Response(JSON.stringify({ error: 'UNAUTHORIZED', message: 'NÃ£o autorizado' }), {
      status: 401,
    });
  }
  return user;
}

export async function requireAdmin(authHeader: string | null): Promise<JwtPayload> {
  const user = await requireAuth(authHeader);
  if (user.role !== 'ADMIN') {
    throw new Response(JSON.stringify({ error: 'FORBIDDEN', message: 'Acesso negado' }), {
      status: 403,
    });
  }
  return user;
}
