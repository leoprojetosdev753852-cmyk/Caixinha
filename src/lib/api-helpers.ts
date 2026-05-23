import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function errorResponse(
  message: string,
  status = 400,
  code?: string,
  details?: unknown,
) {
  return NextResponse.json(
    { error: code ?? 'ERROR', message, details },
    { status },
  );
}

export function handleZodError(error: ZodError) {
  return NextResponse.json(
    {
      error: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details: error.flatten().fieldErrors,
    },
    { status: 400 },
  );
}

/**
 * Wrap handler para capturar erros comuns (Zod, Response throws, etc).
 */
export function withErrorHandling<T extends (...args: any[]) => any>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof Response) {
        return err;
      }
      if (err instanceof ZodError) {
        return handleZodError(err);
      }
      console.error('Erro não tratado:', err);
      return errorResponse('Erro interno', 500, 'INTERNAL_ERROR');
    }
  }) as T;
}
