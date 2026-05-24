'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, PiggyBank, HandCoins } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Header, LogoutButton } from '@/components/layouts/header';

interface Me {
  nomeCompleto?: string;
}

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch<Me>('/api/users/me')
      .then(setMe)
      .catch(() => {});
  }, []);

  return (
    <>
      <Header title="Dashboard" rightSlot={<LogoutButton />} />

      <div className="space-y-6 px-4 py-4">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h1 className="text-2xl font-bold">{me?.nomeCompleto ?? 'Administrador'}</h1>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Caixinhas ativas" valor="—" />
          <KpiCard label="Pontos em aberto" valor="—" />
          <KpiCard label="Empréstimos ativos" valor="—" />
          <KpiCard label="Valor a receber" valor="—" />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Atalhos</h2>
          <div className="grid grid-cols-3 gap-2">
            <AtalhoCard href="/usuarios" icon={Users} label="Usuários" />
            <AtalhoCard href="/caixinhas" icon={PiggyBank} label="Caixinhas" />
            <AtalhoCard href="/emprestimos" icon={HandCoins} label="Empréstimos" />
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Caixinhas e Empréstimos serão habilitados nas próximas fases.
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{valor}</p>
    </div>
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
