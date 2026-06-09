'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, HandCoins, Loader2, Trash2, X } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header, LogoutButton } from '@/components/layouts/header';
import { formatarBRL } from '@/shared';
import { formatDate } from '@/lib/date';

interface EmprestimoItem {
  id: string;
  nomeDevedor: string;
  pixDevedor: string | null;
  tipo: 'A_VISTA' | 'PARCELADO';
  valorOriginal: number;
  status: 'ATIVO' | 'QUITADO' | 'ATRASADO' | 'CANCELADO';
  dataVencimento: string | null;
  criadoEm: string;
  parcelas: Array<{ id: string; status: string; valorDevido: number }>;
}

const STATUS = {
  ATIVO: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-900' },
  QUITADO: { label: 'Quitado', color: 'bg-blue-100 text-blue-900' },
  ATRASADO: { label: 'Atrasado', color: 'bg-destructive/10 text-destructive' },
  CANCELADO: { label: 'Cancelado', color: 'bg-muted text-muted-foreground' },
};

export default function EmprestimosListaPage() {
  const router = useRouter();
  const toast = useToast();

  const [emprestimos, setEmprestimos] = useState<EmprestimoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    try {
      const d = await apiFetch<{ emprestimos: EmprestimoItem[] }>('/api/admin/emprestimos');
      setEmprestimos(d.emprestimos || []);
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

  const handleExcluir = async (e: EmprestimoItem, evt: React.MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();
    const acao = e.status === 'ATIVO' ? 'excluir' : 'cancelar';
    if (!confirm(`Tem certeza que deseja ${acao} este empréstimo?`)) return;

    try {
      const r = await apiFetch<{ acao: string }>(`/api/admin/emprestimos/${e.id}`, {
        method: 'DELETE',
      });
      toast.success(r.acao === 'deleted' ? 'Excluído!' : 'Cancelado!');
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    }
  };

  return (
    <>
      <Header title="Empréstimos" rightSlot={<LogoutButton />} />

      <div className="space-y-4 px-4 py-4">
        <div className="flex gap-2">
          <p className="flex-1 text-sm text-muted-foreground">
            {emprestimos.length} empréstimo{emprestimos.length !== 1 ? 's' : ''}
          </p>
          <Link
            href="/emprestimos/novo"
            className="flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Novo
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && emprestimos.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
            <HandCoins className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum empréstimo cadastrado</p>
            <Link
              href="/emprestimos/novo"
              className="text-sm font-medium text-primary hover:underline"
            >
              Criar o primeiro
            </Link>
          </div>
        )}

        {!loading && emprestimos.length > 0 && (
          <div className="space-y-3">
            {emprestimos.map((e) => {
              const s = STATUS[e.status];
              return (
                <div
                  key={e.id}
                  className="relative block w-full rounded-lg border border-border bg-card"
                >
                  <button
                    onClick={() => router.push(`/emprestimos/${e.id}`)}
                    className="block w-full p-4 text-left hover:bg-accent rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2 pr-8">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{e.nomeDevedor}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatarBRL(e.valorOriginal)} ·{' '}
                          {e.tipo === 'A_VISTA' ? 'À vista' : `${e.parcelas.length}x parcelado`}
                        </p>
                        {e.dataVencimento && e.tipo === 'A_VISTA' && (
                          <p className="text-xs text-muted-foreground">
                            Vence {formatDate(e.dataVencimento)}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}
                      >
                        {s.label}
                      </span>
                    </div>
                  </button>

                  {e.status !== 'CANCELADO' && (
                    <button
                      onClick={(evt) => handleExcluir(e, evt)}
                      className="absolute right-2 top-2 rounded-md p-2 text-destructive hover:bg-destructive/10"
                      aria-label={e.status === 'ATIVO' ? 'Excluir' : 'Cancelar'}
                      title={e.status === 'ATIVO' ? 'Excluir' : 'Cancelar'}
                    >
                      {e.status === 'ATIVO' ? (
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
