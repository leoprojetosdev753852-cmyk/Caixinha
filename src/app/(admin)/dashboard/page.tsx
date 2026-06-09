'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, HandCoins, AlertCircle, TrendingUp, Wallet, Percent } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/stores/auth-store';
import { Header, LogoutButton } from '@/components/layouts/header';
import { formatarBRL } from '@/shared';

interface DashboardData {
  emprestimos: {
    ativos: number;
    atrasados: number;
    valorEmprestado: number;
    jurosAReceber: number;
    valorAReceber: number;
  };
}

export default function DashboardPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const d = await apiFetch<DashboardData>('/api/admin/dashboard');
        setData(d);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Erro');
      } finally {
        setLoading(false);
      }
    };
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header title="Dashboard" rightSlot={<LogoutButton />} />

      <div className="space-y-6 px-4 py-4">
        <div>
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h1 className="text-2xl font-bold">{user?.nomeCompleto || 'Administrador'}</h1>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && data && (
          <>
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resumo
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <HandCoins className="h-4 w-4" />
                    <p className="text-xs">Ativos</p>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{data.emprestimos.ativos}</p>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-xs">Em atraso</p>
                  </div>
                  <p
                    className={`mt-1 text-2xl font-bold ${
                      data.emprestimos.atrasados > 0 ? 'text-destructive' : ''
                    }`}
                  >
                    {data.emprestimos.atrasados}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Valores a receber
              </h2>

              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    <p className="text-xs">Capital emprestado</p>
                  </div>
                  <p className="mt-1 text-xl font-bold">
                    {formatarBRL(data.emprestimos.valorEmprestado)}
                  </p>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Percent className="h-4 w-4" />
                    <p className="text-xs font-medium">Juros a receber</p>
                  </div>
                  <p className="mt-1 text-xl font-bold text-amber-900">
                    {formatarBRL(data.emprestimos.jurosAReceber)}
                  </p>
                </div>

                <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <TrendingUp className="h-4 w-4" />
                    <p className="text-xs font-medium">TOTAL a receber</p>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-emerald-900">
                    {formatarBRL(data.emprestimos.valorAReceber)}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Atalhos
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/emprestimos/novo"
                  className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 hover:bg-accent"
                >
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <HandCoins className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Novo empréstimo</p>
                </Link>
                <Link
                  href="/emprestimos"
                  className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 hover:bg-accent"
                >
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Ver todos</p>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
