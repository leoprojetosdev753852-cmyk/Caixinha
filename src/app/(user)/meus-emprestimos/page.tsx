'use client';

import { useEffect, useState } from 'react';
import { Loader2, HandCoins, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header, LogoutButton } from '@/components/layouts/header';
import { formatarBRL } from '@/shared';
import { formatDate } from '@/lib/date';

interface MeuEmprestimo {
  id: string;
  tipo: 'A_VISTA' | 'PARCELADO';
  valorOriginal: number;
  status: 'ATIVO' | 'QUITADO' | 'ATRASADO' | 'CANCELADO';
  dataVencimento: string | null;
  dataPagamento: string | null;
  valorPago: number;
  valorAtual: number;
  diasAtrasoAtual: number;
  percentualJuros: string;
  parcelas: Array<{
    id: string;
    numero: number;
    valorDevido: number;
    dataVencimento: string;
    status: string;
    dataPagamento: string | null;
  }>;
}

export default function MeusEmprestimosPage() {
  const toast = useToast();
  const [emprestimos, setEmprestimos] = useState<MeuEmprestimo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ emprestimos: MeuEmprestimo[] }>('/api/users/me/emprestimos')
      .then((d) => setEmprestimos(d.emprestimos))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : 'Erro'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header title="Meus empréstimos" rightSlot={<LogoutButton />} />

      <div className="space-y-4 px-4 py-4">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && emprestimos.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
            <HandCoins className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Você não possui empréstimos.</p>
          </div>
        )}

        {emprestimos.map((e) => (
          <div key={e.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {e.tipo === 'A_VISTA' ? 'À vista' : 'Parcelado'}
                </p>
                <p className="text-lg font-semibold">{formatarBRL(e.valorOriginal)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  e.status === 'QUITADO'
                    ? 'bg-blue-100 text-blue-900'
                    : e.status === 'ATRASADO'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {e.status}
              </span>
            </div>

            {e.tipo === 'A_VISTA' && e.dataVencimento && (
              <>
                <div className="rounded-md bg-background p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">A pagar hoje</p>
                  <p className="text-xl font-bold text-primary">
                    {formatarBRL(e.status === 'QUITADO' ? e.valorPago : e.valorAtual)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {formatDate(e.dataVencimento)}
                  </p>
                  {e.diasAtrasoAtual > 0 && e.status !== 'QUITADO' && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {e.diasAtrasoAtual} dia{e.diasAtrasoAtual > 1 ? 's' : ''} de atraso
                    </p>
                  )}
                </div>
              </>
            )}

            {e.tipo === 'PARCELADO' && e.parcelas.length > 0 && (
              <div className="space-y-1">
                {e.parcelas.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    {p.status === 'PAGO' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="flex-1">
                      Parcela {p.numero} — {formatDate(p.dataVencimento)} — {formatarBRL(p.valorDevido)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
