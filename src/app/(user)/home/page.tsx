'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Header, LogoutButton } from '@/components/layouts/header';

interface Me {
  nomeCompleto?: string;
  perfilCompleto?: boolean;
}

export default function UserHomePage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch<Me>('/api/users/me')
      .then(setMe)
      .catch(() => {});
  }, []);

  return (
    <>
      <Header title="Início" rightSlot={<LogoutButton />} />

      <div className="space-y-6 px-4 py-4">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h1 className="text-2xl font-bold">{me?.nomeCompleto?.split(' ')[0] ?? 'usuário'}</h1>
        </header>

        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Você verá aqui suas caixinhas e empréstimos quando o admin alocar você.
        </div>
      </div>
    </>
  );
}
