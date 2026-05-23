/**
 * Cliente HTTP com refresh automático em 401.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    accessToken = data.accessToken;
    return accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, skipAuth, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (!skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const doRequest = () =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doRequest();

  if (res.status === 401 && !skipAuth && !path.startsWith('/api/auth/')) {
    const novoToken = await refreshAccessToken();
    if (novoToken) {
      headers.Authorization = `Bearer ${novoToken}`;
      res = await doRequest();
    }
  }

  if (!res.ok) {
    const erro = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      details?: unknown;
    };
    throw new ApiError(erro.message ?? 'Erro inesperado', res.status, erro.error, erro.details);
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
