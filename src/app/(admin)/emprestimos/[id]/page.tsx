'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  CheckCircle2,
  Circle,
  DollarSign,
  Copy,
  Check,
  Pencil,
  History,
  RefreshCw,
  Percent,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header } from '@/components/layouts/header';
import { Input, Label } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
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

interface Pagamento {
  id: string;
  valorPago: number;
  valorJuros: number;
  valorCapital: number;
  dataPagamento: string;
  tipo: 'INTEGRAL' | 'SO_JUROS_RENOVOU' | 'PARCIAL';
  observacao: string | null;
  novaDataVencimento: string | null;
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
  pagamentos: Pagamento[];
}

const TIPO_PAG_LABEL = {
  INTEGRAL: 'Quitação',
  SO_JUROS_RENOVOU: 'Só juros (renovou)',
  PARCIAL: 'Parcial',
};

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

  // Modal baixa
  const [modalBaixa, setModalBaixa] = useState(false);
  const [tipoBaixa, setTipoBaixa] = useState<'INTEGRAL' | 'SO_JUROS_RENOVOU' | 'PARCIAL'>(
    'INTEGRAL',
  );
  const [dataPag, setDataPag] = useState(toInputDate(new Date()));
  const [valorParcialStr, setValorParcialStr] = useState('');
  const [valorParcialRaw, setValorParcialRaw] = useState(0);
  const [diasRenovacao, setDiasRenovacao] = useState('30');
  const [obs, setObs] = useState('');
  const [baixando, setBaixando] = useState(false);

  // Modal parcela
  const [modalParcela, setModalParcela] = useState<{ parcelaId: string } | null>(null);

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

  const abrirBaixa = () => {
    setTipoBaixa('INTEGRAL');
    setDataPag(toInputDate(new Date()));
    setValorParcialStr('');
    setValorParcialRaw(0);
    setDiasRenovacao('30');
    setObs('');
    setModalBaixa(true);
  };

  const handleBaixar = async () => {
    if (!emp) return;
    if (tipoBaixa === 'PARCIAL' && valorParcialRaw <= 0) {
      toast.error('Informe o valor pago');
      return;
    }
    setBaixando(true);
    try {
      const body: any = {
        dataPagamento: dataPag,
        tipo: tipoBaixa,
        observacao: obs || undefined,
      };
      if (tipoBaixa === 'PARCIAL') body.valorPago = valorParcialRaw;
      if (tipoBaixa === 'SO_JUROS_RENOVOU') body.diasRenovacao = Number(diasRenovacao) || 30;

      await apiFetch(`/api/admin/emprestimos/${id}/baixar`, {
        method: 'POST',
        body,
      });
      toast.success(
        tipoBaixa === 'INTEGRAL'
          ? 'Empréstimo quitado!'
          : tipoBaixa === 'SO_JUROS_RENOVOU'
            ? 'Renovado com sucesso!'
            : 'Pagamento parcial registrado!',
      );
      setModalBaixa(false);
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setBaixando(false);
    }
  };

  const handleBaixarParcela = async () => {
    if (!modalParcela) return;
    setBaixando(true);
    try {
      await apiFetch(`/api/admin/parcelas-emprestimo/${modalParcela.parcelaId}/baixar`, {
        method: 'POST',
        body: { dataPagamento: dataPag, observacao: obs || undefined },
      });
      toast.success('Parcela baixada!');
      setModalParcela(null);
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

  const ativo = emp.status === 'ATIVO' || emp.status === 'ATRASADO';
  const podeEditar = ativo;

  return (
    <>
      <Header
        title="Empréstimo"
        showBack
        rightSlot={
          podeEditar ? (
            <Link
              href={`/emprestimos/${id}/editar`}
              className="rounded-md p-2 hover:bg-accent"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          ) : null
        }
      />

      <div className="space-y-4 px-4 py-4">
        {/* Cabeçalho */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Devedor</p>
              <p className="font-semibold">{emp.nomeDevedor}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                emp.status === 'ATIVO'
                  ? 'bg-emerald-100 text-emerald-900'
                  : emp.status === 'QUITADO'
                    ? 'bg-blue-100 text-blue-900'
                    : emp.status === 'ATRASADO'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground'
              }`}
            >
              {emp.status}
            </span>
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
              <p className="text-xs text-muted-foreground">Valor original</p>
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

          {emp.valorPago > 0 && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm">
              <p className="text-xs text-emerald-800">Total pago até agora</p>
              <p className="font-bold text-emerald-900">{formatarBRL(emp.valorPago)}</p>
            </div>
          )}

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
                <p className="text-xs text-muted-foreground">Vencimento atual</p>
                <p className="font-semibold">{formatDate(emp.dataVencimento)}</p>
              </div>
            </div>
            {ativo && (
              <button
                onClick={abrirBaixa}
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
                        setModalParcela({ parcelaId: p.id });
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

        {/* Histórico de pagamentos */}
        {emp.pagamentos && emp.pagamentos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Histórico de pagamentos</p>
            </div>
            {emp.pagamentos.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{TIPO_PAG_LABEL[p.tipo]}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.dataPagamento)}
                    </p>
                  </div>
                  <p className="font-bold text-emerald-700">{formatarBRL(p.valorPago)}</p>
                </div>
                {p.tipo === 'SO_JUROS_RENOVOU' && p.novaDataVencimento && (
                  <p className="mt-1 text-xs text-blue-700">
                    Renovado até {formatDate(p.novaDataVencimento)}
                  </p>
                )}
                {p.observacao && (
                  <p className="mt-1 text-xs text-muted-foreground">{p.observacao}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal baixa com 3 opções */}
      <Modal open={modalBaixa} onClose={() => setModalBaixa(false)} title="Registrar pagamento">
        <div className="space-y-4">
          {/* Seletor de tipo */}
          <div className="space-y-2">
            <Label>Tipo de pagamento</Label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setTipoBaixa('INTEGRAL')}
                className={`flex w-full items-start gap-3 rounded-md border-2 p-3 text-left ${
                  tipoBaixa === 'INTEGRAL'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-input'
                }`}
              >
                <CheckCircle2
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    tipoBaixa === 'INTEGRAL' ? 'text-emerald-600' : 'text-muted-foreground'
                  }`}
                />
                <div>
                  <p className="font-medium text-sm">Quitar empréstimo</p>
                  <p className="text-xs text-muted-foreground">
                    Pagamento total (capital + juros). Empréstimo é encerrado.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoBaixa('SO_JUROS_RENOVOU')}
                className={`flex w-full items-start gap-3 rounded-md border-2 p-3 text-left ${
                  tipoBaixa === 'SO_JUROS_RENOVOU'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-input'
                }`}
              >
                <RefreshCw
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    tipoBaixa === 'SO_JUROS_RENOVOU' ? 'text-amber-600' : 'text-muted-foreground'
                  }`}
                />
                <div>
                  <p className="font-medium text-sm">Pagar só juros e renovar</p>
                  <p className="text-xs text-muted-foreground">
                    Recebe só os juros, capital continua emprestado, novo vencimento.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoBaixa('PARCIAL')}
                className={`flex w-full items-start gap-3 rounded-md border-2 p-3 text-left ${
                  tipoBaixa === 'PARCIAL' ? 'border-blue-500 bg-blue-50' : 'border-input'
                }`}
              >
                <Percent
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    tipoBaixa === 'PARCIAL' ? 'text-blue-600' : 'text-muted-foreground'
                  }`}
                />
                <div>
                  <p className="font-medium text-sm">Pagamento parcial</p>
                  <p className="text-xs text-muted-foreground">
                    Pessoa pagou só uma parte. Restante continua devendo.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Campos condicionais */}
          {tipoBaixa === 'PARCIAL' && (
            <div className="space-y-2">
              <Label>Valor pago</Label>
              <MoneyInput
                value={valorParcialStr}
                onChange={(str, raw) => {
                  setValorParcialStr(str);
                  setValorParcialRaw(raw);
                }}
              />
            </div>
          )}

          {tipoBaixa === 'SO_JUROS_RENOVOU' && (
            <div className="space-y-2">
              <Label>Renovar por quantos dias?</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={diasRenovacao}
                onChange={(e) => setDiasRenovacao(e.target.value)}
              />
            </div>
          )}

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
            {baixando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar pagamento'}
          </button>
        </div>
      </Modal>

      {/* Modal baixar parcela */}
      <Modal
        open={!!modalParcela}
        onClose={() => setModalParcela(null)}
        title="Baixar parcela"
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
            onClick={handleBaixarParcela}
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
