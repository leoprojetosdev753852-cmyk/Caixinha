'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, PiggyBank, Loader2, Trash2, X } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header, LogoutButton } from '@/components/layouts/header';
import { formatarBRL } from '@/shared';

interface CaixinhaItem {
  id: string;
  nome: string;
  status: 'RASCUNHO' | 'ATIVA' | 'CONCLUIDA' | 'CANCELADA';
  valorTotal: number;
  quantidadePontos: number;
  pontosOcupados: number;
  pontosVagos: number;
  pagamentosPendentes: number;
  pagamentosPagos: number;
}

const STATUS_LABEL = {
  RASCUNHO: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  ATIVA: { label: 'Ativa', color: 'bg-emerald-100 text-emerald-900' },
  CONCLUIDA: { label: 'Concluída', color: 'bg-blue-100 text-blue-900' },
  CANCELADA: { label: 'Cancelada', color: 'bg-destructive/10 text-destructive' },
};

export default function CaixinhasListaPage() {
  const router = useRouter();
  const toast = useToast();

  const [caixinhas, setCaixinhas] = useState<CaixinhaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    try {
      const d = await apiFetch<{ caixinhas: CaixinhaItem[] }>('/api/admin/caixinhas');
      setCaixinhas(d.caixinhas || []);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExcluir = async (c: CaixinhaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const acao = c.status === 'RASCUNHO' ? 'excluir' : 'cancelar';
    if (!confirm(`Tem certeza que deseja ${acao} "${c.nome}"?`)) return;

    try {
      const r = await apiFetch<{ acao: string }>(`/api/admin/caixinhas/${c.id}`, {
        method: 'DELETE',
      });
      toast.success(r.acao === 'deleted' ? 'Excluída!' : 'Cancelada!');
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    }
  };

  return (
    <>
      <Header title="Caixinhas" rightSlot={<LogoutButton />} />

      <div className="space-y-4 px-4 py-4">
        <div className="flex gap-2">
          <p className="flex-1 text-sm text-muted-foreground">
            {caixinhas.length} caixinha{caixinhas.length !== 1 ? 's' : ''}
          </p>
          <Link
            href="/caixinhas/nova"
            className="flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nova
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && caixinhas.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
            <PiggyBank className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma caixinha criada</p>
            <Link href="/caixinhas/nova" className="text-sm font-medium text-primary hover:underline">
              Criar a primeira
            </Link>
          </div>
        )}

        {!loading && caixinhas.length > 0 && (
          <div className="space-y-3">
            {caixinhas.map((c) => {
              const totalPagamentos = c.pagamentosPagos + c.pagamentosPendentes;
              const progresso =
                totalPagamentos > 0 ? (c.pagamentosPagos / totalPagamentos) * 100 : 0;
              const status = STATUS_LABEL[c.status];

              return (
                <div
                  key={c.id}
                  className="relative block w-full rounded-lg border border-border bg-card"
                >
                  <button
                    onClick={() => router.push(`/caixinhas/${c.id}`)}
                    className="block w-full p-4 text-left hover:bg-accent rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2 pr-8">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{c.nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          {c.quantidadePontos} pontos · {formatarBRL(c.valorTotal)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {c.status === 'ATIVA' && totalPagamentos > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progresso}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.pagamentosPagos}/{totalPagamentos} pagamentos
                        </p>
                      </div>
                    )}

                    {c.status === 'RASCUNHO' && c.pontosVagos > 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        {c.pontosVagos} ponto{c.pontosVagos !== 1 ? 's' : ''} com cotas incompletas
                      </p>
                    )}
                  </button>

                  {c.status !== 'CANCELADA' && (
                    <button
                      onClick={(e) => handleExcluir(c, e)}
                      className="absolute right-2 top-2 rounded-md p-2 text-destructive hover:bg-destructive/10"
                      aria-label={c.status === 'RASCUNHO' ? 'Excluir' : 'Cancelar'}
                      title={c.status === 'RASCUNHO' ? 'Excluir' : 'Cancelar'}
                    >
                      {c.status === 'RASCUNHO' ? (
                        <Trash2 className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
