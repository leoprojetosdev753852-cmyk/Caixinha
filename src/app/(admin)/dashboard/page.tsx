'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  PiggyBank,
  HandCoins,
  Loader2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Header, LogoutButton } from '@/components/layouts/header';
import { formatarBRL } from '@/shared';

interface DashData {
  caixinhas: {
    ativas: number;
    pontosEmAberto: number;
    pagamentosPendentes: number;
    valorPendente: number;
    drilldownPontosVagos: Array<{
      caixinhaId: string;
      caixinhaNome: string;
      pontoNumero: number;
      valorVago: number;
    }>;
  };
  emprestimos: {
    ativos: number;
    valorEmprestado: number;
    valorAReceber: number;
  };
}

interface Me {
  nomeCompleto?: string;
}

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [data, setData] = useState<DashData | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);

  useEffect(() => {
    apiFetch<Me>('/api/users/me').then(setMe).catch(() => {});
    apiFetch<DashData>('/api/admin/dashboard').then(setData).catch(() => {});
  }, []);

  return (
    <>
      <Header title="Dashboard" rightSlot={<LogoutButton />} />

      <div className="space-y-6 px-4 py-4">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h1 className="text-2xl font-bold">{me?.nomeCompleto?.split(' ')[0] ?? 'Admin'}</h1>
        </header>

        {!data && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {data && (
          <>
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Caixinhas
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/caixinhas" className="rounded-lg border border-border bg-card p-4 hover:bg-accent">
                  <p className="text-xs text-muted-foreground">Ativas</p>
                  <p className="mt-1 text-2xl font-bold">{data.caixinhas.ativas}</p>
                </Link>
                <button
                  onClick={() => setDrilldownOpen(!drilldownOpen)}
                  className="rounded-lg border border-border bg-card p-4 text-left hover:bg-accent"
                >
                  <p className="text-xs text-muted-foreground">Pontos vagos</p>
                  <p className="mt-1 text-2xl font-bold">{data.caixinhas.pontosEmAberto}</p>
                </button>
                <div className="col-span-2 rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">A receber este ciclo</p>
                  <p className="mt-1 text-xl font-bold">{formatarBRL(data.caixinhas.valorPendente)}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.caixinhas.pagamentosPendentes} pagamento{data.caixinhas.pagamentosPendentes !== 1 ? 's' : ''} pendente{data.caixinhas.pagamentosPendentes !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {drilldownOpen && data.caixinhas.drilldownPontosVagos.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-900">
                    Pontos pendentes de alocação:
                  </p>
                  {data.caixinhas.drilldownPontosVagos.map((d, idx) => (
                    <Link
                      key={idx}
                      href={`/caixinhas/${d.caixinhaId}`}
                      className="block rounded border border-amber-300 bg-white p-2 text-sm hover:bg-amber-100"
                    >
                      <span className="font-medium">{d.caixinhaNome}</span>{' '}
                      <span className="text-muted-foreground">— Ponto {d.pontoNumero}</span>{' '}
                      <span className="text-xs text-amber-700">
                        (falta {formatarBRL(d.valorVago)})
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Empréstimos
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/emprestimos" className="rounded-lg border border-border bg-card p-4 hover:bg-accent">
                  <p className="text-xs text-muted-foreground">Ativos</p>
                  <p className="mt-1 text-2xl font-bold">{data.emprestimos.ativos}</p>
                </Link>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Emprestado</p>
                  <p className="mt-1 text-xl font-bold">{formatarBRL(data.emprestimos.valorEmprestado)}</p>
                </div>
                <div className="col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-900">A receber (com juros)</p>
                  <p className="mt-1 text-xl font-bold text-emerald-900">
                    {formatarBRL(data.emprestimos.valorAReceber)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Atalhos
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <AtalhoCard href="/usuarios" icon={Users} label="Usuários" />
            <AtalhoCard href="/caixinhas" icon={PiggyBank} label="Caixinhas" />
            <AtalhoCard href="/emprestimos" icon={HandCoins} label="Empréstimos" />
          </div>
        </div>
      </div>
    </>
  );
}

function AtalhoCard({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href as any}
      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 transition hover:bg-accent"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
