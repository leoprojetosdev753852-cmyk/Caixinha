'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Circle, DollarSign, Copy, Check } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header } from '@/components/layouts/header';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatarBRL } from '@/shared';
import { formatDate, toInputDate } from '@/lib/date';

interface Parcela {
  id: string;
  numero: number;
  valorDevido: number;
  dataVencimento: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
  valorPago: number;
  dataPagamento: string | null;
  diasAtraso: number;
}

interface Emprestimo {
  id: string;
  nomeDevedor: string;
  pixDevedor: string | null;
  observacao: string | null;
  tipo: 'A_VISTA' | 'PARCELADO';
  valorOriginal: number;
  percentualJuros: string;
  percentualJurosAtraso: string;
  dataVencimento: string | null;
  valorPago: number;
  dataPagamento: string | null;
  diasAtraso: number;
  status: 'ATIVO' | 'QUITADO' | 'ATRASADO' | 'CANCELADO';
  parcelas: Parcela[];
}

interface PageProps {
  params: { id: string };
}

export default function EmprestimoDetalhePage({ params }: PageProps) {
  const id = params.id;
  const router = useRouter();
  const toast = useToast();

  const [emp, setEmp] = useState<Emprestimo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const [modalBaixa, setModalBaixa] = useState<{
    tipo: 'AVISTA' | 'PARCELA';
    parcelaId?: string;
  } | null>(null);
  const [dataPag, setDataPag] = useState(toInputDate(new Date()));
  const [obs, setObs] = useState('');
  const [baixando, setBaixando] = useState(false);

  const carregar = async () => {
    try {
      const data = await apiFetch<Emprestimo>(`/api/admin/emprestimos/${id}`);
      setEmp(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
      router.push('/emprestimos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleBaixar = async () => {
    if (!modalBaixa) return;
    setBaixando(true);
    try {
      if (modalBaixa.tipo === 'AVISTA') {
        await apiFetch(`/api/admin/emprestimos/${id}/baixar`, {
          method: 'POST',
          body: { dataPagamento: dataPag, observacao: obs || undefined },
        });
      } else {
        await apiFetch(`/api/admin/parcelas-emprestimo/${modalBaixa.parcelaId}/baixar`, {
          method: 'POST',
          body: { dataPagamento: dataPag, observacao: obs || undefined },
        });
      }
      toast.success('Pagamento registrado!');
      setModalBaixa(null);
      setObs('');
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setBaixando(false);
    }
  };

  const handleCopiarPix = async () => {
    if (!emp?.pixDevedor) return;
    try {
      await navigator.clipboard.writeText(emp.pixDevedor);
      setCopiado(true);
      toast.success('PIX copiado!');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Carregando..." showBack />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }
  if (!emp) return null;

  const quitado = emp.status === 'QUITADO';

  return (
    <>
      <Header title="Empréstimo" showBack />

      <div className="space-y-4 px-4 py-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Devedor</p>
            <p className="font-semibold">{emp.nomeDevedor}</p>
          </div>

          {emp.pixDevedor && (
            <div>
              <p className="text-xs text-muted-foreground">PIX</p>
              <div className="flex items-center gap-2">
                <p className="break-all text-sm font-mono flex-1">{emp.pixDevedor}</p>
                <button
                  onClick={handleCopiarPix}
                  className="shrink-0 rounded-md p-1.5 hover:bg-accent"
                  aria-label="Copiar PIX"
                >
                  {copiado ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="font-semibold">{formatarBRL(emp.valorOriginal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-semibold">{emp.tipo === 'A_VISTA' ? 'À vista' : 'Parcelado'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Juros</p>
              <p className="font-semibold">{emp.percentualJuros}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Juros/dia atraso</p>
              <p className="font-semibold">{emp.percentualJurosAtraso}%</p>
            </div>
          </div>

          {emp.observacao && (
            <div>
              <p className="text-xs text-muted-foreground">Observação</p>
              <p className="text-sm">{emp.observacao}</p>
            </div>
          )}
        </div>

        {/* À vista */}
        {emp.tipo === 'A_VISTA' && emp.dataVencimento && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className="font-semibold">{formatDate(emp.dataVencimento)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  quitado ? 'bg-blue-100 text-blue-900' : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                {quitado ? 'Pago' : 'A pagar'}
              </span>
            </div>
            {quitado && emp.dataPagamento && (
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Pago em</p>
                <p className="font-semibold">{formatDate(emp.dataPagamento)}</p>
                <p className="text-xs text-muted-foreground mt-1">Valor pago</p>
                <p className="font-semibold">{formatarBRL(emp.valorPago)}</p>
                {emp.diasAtraso > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {emp.diasAtraso} dia{emp.diasAtraso > 1 ? 's' : ''} de atraso
                  </p>
                )}
              </div>
            )}
            {!quitado && (
              <button
                onClick={() => {
                  setModalBaixa({ tipo: 'AVISTA' });
                  setDataPag(toInputDate(new Date()));
                  setObs('');
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <DollarSign className="h-4 w-4" /> Registrar pagamento
              </button>
            )}
          </div>
        )}

        {/* Parcelado */}
        {emp.tipo === 'PARCELADO' && emp.parcelas.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Parcelas</p>
            {emp.parcelas.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {p.status === 'PAGO' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <p className="text-sm font-semibold">Parcela {p.numero}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatarBRL(p.valorDevido)} · Vence {formatDate(p.dataVencimento)}
                    </p>
                    {p.status === 'PAGO' && p.dataPagamento && (
                      <p className="text-xs text-emerald-700">
                        Pago em {formatDate(p.dataPagamento)} ({formatarBRL(p.valorPago)})
                      </p>
                    )}
                  </div>
                  {p.status !== 'PAGO' && (
                    <button
                      onClick={() => {
                        setModalBaixa({ tipo: 'PARCELA', parcelaId: p.id });
                        setDataPag(toInputDate(new Date()));
                        setObs('');
                      }}
                      className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Baixar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!modalBaixa}
        onClose={() => setModalBaixa(null)}
        title="Registrar pagamento"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data do pagamento</Label>
            <Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Input value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
          <button
            onClick={handleBaixar}
            disabled={baixando}
            className="flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-medium text-primary-foreground disabled:opacity-50"
          >
            {baixando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar'}
          </button>
        </div>
      </Modal>
    </>
  );
}
