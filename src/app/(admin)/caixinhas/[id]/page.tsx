'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  UserPlus,
  Trash2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Play,
  AlertCircle,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header } from '@/components/layouts/header';
import { Input, Label } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Modal } from '@/components/ui/modal';
import { formatarBRL, formatarCPF } from '@/shared';
import { formatDate, toInputDate } from '@/lib/date';

interface Cota {
  id: string;
  valor: number;
  usuario: { id: string; nomeCompleto: string; cpf: string };
  pagamentos: Pagamento[];
}

interface Pagamento {
  id: string;
  valorDevido: number;
  dataVencimento: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
  dataPagamento: string | null;
  observacao: string | null;
}

interface Ponto {
  id: string;
  numero: number;
  valor: number;
  dataContemplacao: string | null;
  cotas: Cota[];
}

interface Caixinha {
  id: string;
  nome: string;
  observacao: string | null;
  status: 'RASCUNHO' | 'ATIVA' | 'CONCLUIDA' | 'CANCELADA';
  pontos: Ponto[];
}

interface UsuarioOpcao {
  id: string;
  nomeCompleto: string;
  cpf: string;
}

export default function CaixinhaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();

  const [caixinha, setCaixinha] = useState<Caixinha | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal alocar cota
  const [modalCota, setModalCota] = useState<{ pontoId: string } | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioOpcao[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [valorCotaStr, setValorCotaStr] = useState('');
  const [valorCotaRaw, setValorCotaRaw] = useState(0);
  const [salvandoCota, setSalvandoCota] = useState(false);

  // Modal ativar
  const [modalAtivar, setModalAtivar] = useState(false);
  const [parcelas, setParcelas] = useState<string[]>([toInputDate(new Date())]);
  const [ativando, setAtivando] = useState(false);

  // Modal baixar pagamento
  const [modalBaixa, setModalBaixa] = useState<{ pagamentoId: string } | null>(null);
  const [dataPag, setDataPag] = useState(toInputDate(new Date()));
  const [obsPag, setObsPag] = useState('');
  const [baixando, setBaixando] = useState(false);

  const carregar = async () => {
    try {
      const c = await apiFetch<Caixinha>(`/api/admin/caixinhas/${id}`);
      setCaixinha(c);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
      router.push('/caixinhas');
    } finally {
      setLoading(false);
    }
  };

  const carregarUsuarios = async () => {
    try {
      const r = await apiFetch<{ usuarios: UsuarioOpcao[] }>('/api/admin/usuarios?apenas=ativos');
      setUsuarios(r.usuarios);
    } catch {
      // ignora
    }
  };

  useEffect(() => {
    carregar();
    carregarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const valorTotalCaixinha = caixinha?.pontos.reduce((acc, p) => acc + p.valor, 0) ?? 0;

  // Adicionar cota
  const abrirModalCota = (pontoId: string) => {
    setModalCota({ pontoId });
    setUsuarioSelecionado('');
    setValorCotaStr('');
    setValorCotaRaw(0);
  };

  const handleSalvarCota = async () => {
    if (!modalCota || !usuarioSelecionado || valorCotaRaw <= 0) {
      toast.error('Preencha todos os campos');
      return;
    }
    setSalvandoCota(true);
    try {
      await apiFetch(
        `/api/admin/caixinhas/${id}/pontos/${modalCota.pontoId}/cotas`,
        {
          method: 'POST',
          body: { usuarioId: usuarioSelecionado, valor: valorCotaRaw },
        },
      );
      toast.success('Cota adicionada!');
      setModalCota(null);
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setSalvandoCota(false);
    }
  };

  const handleRemoverCota = async (pontoId: string, cotaId: string) => {
    if (!confirm('Remover esta cota?')) return;
    try {
      await apiFetch(`/api/admin/caixinhas/${id}/pontos/${pontoId}/cotas/${cotaId}`, {
        method: 'DELETE',
      });
      toast.success('Cota removida');
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    }
  };

  const handleAtivar = async () => {
    if (parcelas.length === 0 || parcelas.some((p) => !p)) {
      toast.error('Defina datas para todas as parcelas');
      return;
    }
    setAtivando(true);
    try {
      await apiFetch(`/api/admin/caixinhas/${id}/ativar`, {
        method: 'POST',
        body: { parcelas: parcelas.map((dataVencimento) => ({ dataVencimento })) },
      });
      toast.success('Caixinha ativada!');
      setModalAtivar(false);
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setAtivando(false);
    }
  };

  const handleBaixar = async () => {
    if (!modalBaixa) return;
    setBaixando(true);
    try {
      await apiFetch(`/api/admin/pagamentos-cota/${modalBaixa.pagamentoId}/baixar`, {
        method: 'POST',
        body: { dataPagamento: dataPag, observacao: obsPag || undefined },
      });
      toast.success('Pagamento baixado!');
      setModalBaixa(null);
      setObsPag('');
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setBaixando(false);
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
  if (!caixinha) return null;

  const isRascunho = caixinha.status === 'RASCUNHO';

  return (
    <>
      <Header title={caixinha.nome} showBack />

      <div className="space-y-4 px-4 py-4">
        {/* Header info */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="text-2xl font-bold">{formatarBRL(valorTotalCaixinha)}</p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                caixinha.status === 'ATIVA'
                  ? 'bg-emerald-100 text-emerald-900'
                  : caixinha.status === 'RASCUNHO'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {caixinha.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {caixinha.pontos.length} pontos
          </p>
        </div>

        {/* Botão ativar se rascunho */}
        {isRascunho && (
          <button
            onClick={() => setModalAtivar(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-base font-medium text-white hover:bg-emerald-700"
          >
            <Play className="h-4 w-4" /> Ativar caixinha
          </button>
        )}

        {/* Lista pontos */}
        <div className="space-y-3">
          {caixinha.pontos.map((p) => {
            const somaCotas = p.cotas.reduce((acc, c) => acc + c.valor, 0);
            const restante = p.valor - somaCotas;
            const completo = restante === 0 && p.cotas.length > 0;

            return (
              <div key={p.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Ponto {p.numero}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatarBRL(p.valor)}
                      {p.dataContemplacao && (
                        <>
                          {' · '}
                          <CalendarDays className="inline h-3 w-3" />{' '}
                          {formatDate(p.dataContemplacao)}
                        </>
                      )}
                    </p>
                  </div>
                  {completo ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                      Completo
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      Falta {formatarBRL(restante)}
                    </span>
                  )}
                </div>

                {/* Cotas */}
                {p.cotas.length > 0 && (
                  <div className="space-y-2">
                    {p.cotas.map((cota) => {
                      const totalPag = cota.pagamentos.length;
                      const pagosCount = cota.pagamentos.filter((pg) => pg.status === 'PAGO').length;

                      return (
                        <div key={cota.id} className="rounded-md border border-border bg-background p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{cota.usuario.nomeCompleto}</p>
                              <p className="text-xs text-muted-foreground">{formatarCPF(cota.usuario.cpf)} · {formatarBRL(cota.valor)}</p>
                            </div>
                            {isRascunho && (
                              <button
                                onClick={() => handleRemoverCota(p.id, cota.id)}
                                className="rounded-md p-1 text-destructive hover:bg-destructive/10"
                                aria-label="Remover cota"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {totalPag > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">
                                {pagosCount}/{totalPag} pagamentos
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {cota.pagamentos.map((pag) => (
                                  <button
                                    key={pag.id}
                                    onClick={() => {
                                      if (pag.status !== 'PAGO') {
                                        setModalBaixa({ pagamentoId: pag.id });
                                        setDataPag(toInputDate(new Date()));
                                        setObsPag('');
                                      }
                                    }}
                                    title={`${formatDate(pag.dataVencimento)} - ${formatarBRL(pag.valorDevido)}`}
                                    className={`flex h-7 items-center gap-1 rounded border px-2 text-xs ${
                                      pag.status === 'PAGO'
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                        : 'border-border bg-background hover:bg-accent'
                                    }`}
                                  >
                                    {pag.status === 'PAGO' ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <Circle className="h-3 w-3" />
                                    )}
                                    {formatDate(pag.dataVencimento)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botão adicionar cotista (só rascunho e ponto não completo) */}
                {isRascunho && !completo && (
                  <button
                    onClick={() => abrirModalCota(p.id)}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background text-sm font-medium text-muted-foreground hover:bg-accent"
                  >
                    <UserPlus className="h-4 w-4" /> Adicionar cotista
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal adicionar cota */}
      <Modal
        open={!!modalCota}
        onClose={() => setModalCota(null)}
        title="Adicionar cotista"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <select
              value={usuarioSelecionado}
              onChange={(e) => setUsuarioSelecionado(e.target.value)}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nomeCompleto} · {formatarCPF(u.cpf)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Valor da cota</Label>
            <MoneyInput
              value={valorCotaStr}
              onChange={(str, raw) => {
                setValorCotaStr(str);
                setValorCotaRaw(raw);
              }}
            />
          </div>
          <button
            onClick={handleSalvarCota}
            disabled={salvandoCota}
            className="flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-medium text-primary-foreground disabled:opacity-50"
          >
            {salvandoCota ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Adicionar'}
          </button>
        </div>
      </Modal>

      {/* Modal ativar */}
      <Modal open={modalAtivar} onClose={() => setModalAtivar(false)} title="Ativar caixinha">
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>
              Ao ativar, serão gerados pagamentos para todas as cotas dos pontos completos.
              Você não pode editar pontos ou cotas após ativar.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Datas de vencimento das parcelas</Label>
            <p className="text-xs text-muted-foreground">
              Defina uma data por mês (parcela). Cada cota pagará nessas datas.
            </p>
          </div>

          {parcelas.map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                type="date"
                value={p}
                onChange={(e) => {
                  const ps = [...parcelas];
                  ps[idx] = e.target.value;
                  setParcelas(ps);
                }}
                className="flex-1"
              />
              {parcelas.length > 1 && (
                <button
                  type="button"
                  onClick={() => setParcelas(parcelas.filter((_, i) => i !== idx))}
                  className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setParcelas([...parcelas, ''])}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Adicionar parcela
          </button>

          <button
            onClick={handleAtivar}
            disabled={ativando}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-base font-medium text-white disabled:opacity-50"
          >
            {ativando ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <><Play className="h-4 w-4" /> Confirmar ativação</>
            )}
          </button>
        </div>
      </Modal>

      {/* Modal baixar pagamento */}
      <Modal open={!!modalBaixa} onClose={() => setModalBaixa(null)} title="Baixar pagamento">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data do pagamento</Label>
            <Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Input value={obsPag} onChange={(e) => setObsPag(e.target.value)} />
          </div>
          <button
            onClick={handleBaixar}
            disabled={baixando}
            className="flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-medium text-primary-foreground disabled:opacity-50"
          >
            {baixando ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar baixa'}
          </button>
        </div>
      </Modal>
    </>
  );
}

// Importar lucide-react Plus pra usar no JSX
import { Plus } from 'lucide-react';
