'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, PiggyBank, CheckCircle2, Circle } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header, LogoutButton } from '@/components/layouts/header';
import { formatarBRL } from '@/shared';
import { formatDate } from '@/lib/date';

interface MinhaCaixinha {
  caixinha: { id: string; nome: string; status: string };
  participacoes: Array<{
    cotaId: string;
    valorCota: number;
    ponto: {
      id: string;
      numero: number;
      valor: number;
      dataContemplacao: string | null;
    };
    pagamentos: Array<{
      id: string;
      valorDevido: number;
      dataVencimento: string;
      status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
      dataPagamento: string | null;
    }>;
  }>;
}

export default function MinhasCaixinhasPage() {
  const toast = useToast();
  const [caixinhas, setCaixinhas] = useState<MinhaCaixinha[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ caixinhas: MinhaCaixinha[] }>('/api/users/me/caixinhas')
      .then((d) => setCaixinhas(d.caixinhas))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : 'Erro'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header title="Minhas caixinhas" rightSlot={<LogoutButton />} />

      <div className="space-y-4 px-4 py-4">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && caixinhas.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
            <PiggyBank className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Você ainda não foi alocado em nenhuma caixinha.
            </p>
          </div>
        )}

        {caixinhas.map((c) => (
          <div key={c.caixinha.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{c.caixinha.nome}</h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                {c.caixinha.status}
              </span>
            </div>

            {c.participacoes.map((part) => {
              const totalPag = part.pagamentos.length;
              const pagosCount = part.pagamentos.filter((p) => p.status === 'PAGO').length;
              return (
                <div key={part.cotaId} className="space-y-2 rounded-md bg-background p-3">
                  <div className="flex justify-between text-sm">
                    <span>Ponto {part.ponto.numero}</span>
                    <span className="font-medium">{formatarBRL(part.valorCota)}/mês</span>
                  </div>
                  {part.ponto.dataContemplacao && (
                    <p className="text-xs text-muted-foreground">
                      Recebe em {formatDate(part.ponto.dataContemplacao)}
                    </p>
                  )}
                  {totalPag > 0 && (
                    <>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(pagosCount / totalPag) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pagosCount}/{totalPag} pagamentos
                      </p>
                      <div className="space-y-1">
                        {part.pagamentos.map((pag) => (
                          <div
                            key={pag.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            {pag.status === 'PAGO' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="flex-1">
                              {formatDate(pag.dataVencimento)} — {formatarBRL(pag.valorDevido)}
                            </span>
                            <span
                              className={
                                pag.status === 'PAGO' ? 'text-emerald-700' : 'text-muted-foreground'
                              }
                            >
                              {pag.status === 'PAGO' ? 'pago' : 'pendente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
