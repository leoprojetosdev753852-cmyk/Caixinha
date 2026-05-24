'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface SessionGuardProps {
  requiredRole: 'ADMIN' | 'USER';
  children: React.ReactNode;
}

/**
 * Componente que:
 * 1. Tenta refresh do token ao montar (caso F5/sessão sem accessToken em memória)
 * 2. Busca /api/users/me pra confirmar identidade
 * 3. Redireciona se role não bater
 */
export function SessionGuard({ requiredRole, children }: SessionGuardProps) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const hidratar = async () => {
      try {
        // 1. Se ainda não tem user em memória, tenta refresh + me
        if (!user) {
          // Tenta refresh
          const refresh = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });
          if (!refresh.ok) {
            if (!cancelado) router.replace('/login');
            return;
          }
          const data = (await refresh.json()) as {
            accessToken: string;
            user: { id: string; cpf: string; role: 'ADMIN' | 'USER'; nomeCompleto?: string };
          };
          setSession(data.accessToken, data.user);

          if (data.user.role !== requiredRole) {
            if (!cancelado) {
              router.replace(data.user.role === 'ADMIN' ? '/dashboard' : '/home');
            }
            return;
          }
        } else {
          // Já tem user em memória — só confere role
          if (user.role !== requiredRole) {
            if (!cancelado) {
              router.replace(user.role === 'ADMIN' ? '/dashboard' : '/home');
            }
            return;
          }
        }

        if (!cancelado) setChecking(false);
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          if (!cancelado) router.replace('/login');
        } else {
          console.error(err);
          if (!cancelado) router.replace('/login');
        }
      }
    };

    hidratar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredRole]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
