'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, HandCoins, Plus, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header } from '@/components/layouts/header';
import { Input, Label } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { toInputDate } from '@/lib/date';

interface ParcelaForm {
  numero: number;
  valor: number;
  valorStr: string;
  dataVencimento: string;
}

export default function NovoEmprestimoPage() {
  const router = useRouter();
  const toast = useToast();

  const [nomeDevedor, setNomeDevedor] = useState('');
  const [pixDevedor, setPixDevedor] = useState('');
  const [observacao, setObservacao] = useState('');
  const [tipo, setTipo] = useState<'A_VISTA' | 'PARCELADO'>('A_VISTA');
  const [valorOriginalStr, setValorOriginalStr] = useState('');
  const [valorOriginal, setValorOriginal] = useState(0);
  const [percentualJuros, setPercentualJuros] = useState('10');
  const [percentualJurosAtraso, setPercentualJurosAtraso] = useState('0.5');
  const [dataVencimento, setDataVencimento] = useState(toInputDate(new Date()));
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([
    { numero: 1, valor: 0, valorStr: '', dataVencimento: toInputDate(new Date()) },
  ]);
  const [loading, setLoading] = useState(false);

  const adicionarParcela = () => {
    const prox = parcelas.length > 0 ? Math.max(...parcelas.map((p) => p.numero)) + 1 : 1;
    setParcelas([
      ...parcelas,
      { numero: prox, valor: 0, valorStr: '', dataVencimento: toInputDate(new Date()) },
    ]);
  };

  const removerParcela = (idx: number) => {
    if (parcelas.length === 1) return;
    setParcelas(parcelas.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nomeDevedor.trim().length < 2) {
      toast.error('Informe o nome do devedor');
      return;
    }
    if (valorOriginal <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    if (tipo === 'PARCELADO' && parcelas.some((p) => p.valor <= 0 || !p.dataVencimento)) {
      toast.error('Preencha todas as parcelas');
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        nomeDevedor: nomeDevedor.trim(),
        pixDevedor: pixDevedor.trim() || undefined,
        observacao: observacao.trim() || undefined,
        tipo,
        valorOriginal,
        percentualJuros: Number(percentualJuros),
        percentualJurosAtraso: Number(percentualJurosAtraso),
      };
      if (tipo === 'A_VISTA') {
        body.dataVencimento = dataVencimento;
      } else {
        body.parcelas = parcelas.map((p) => ({
          numero: p.numero,
          valorDevido: p.valor,
          dataVencimento: p.dataVencimento,
        }));
      }

      const result = await apiFetch<{ emprestimo: { id: string } }>('/api/admin/emprestimos', {
        method: 'POST',
        body,
      });
      toast.success('Empréstimo criado!');
      router.push(`/emprestimos/${result.emprestimo.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Novo empréstimo" showBack />

      <form onSubmit={handleSubmit} className="space-y-5 px-4 py-4">
        <div className="flex justify-center pb-2">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <HandCoins className="h-7 w-7" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome do devedor</Label>
          <Input
            id="nome"
            value={nomeDevedor}
            onChange={(e) => setNomeDevedor(e.target.value)}
            placeholder="Ex: João Silva"
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pix">PIX do devedor (opcional)</Label>
          <Input
            id="pix"
            value={pixDevedor}
            onChange={(e) => setPixDevedor(e.target.value)}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo('A_VISTA')}
              className={`flex h-12 items-center justify-center rounded-md border-2 font-medium ${
                tipo === 'A_VISTA'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-input'
              }`}
            >
              À vista
            </button>
            <button
              type="button"
              onClick={() => setTipo('PARCELADO')}
              className={`flex h-12 items-center justify-center rounded-md border-2 font-medium ${
                tipo === 'PARCELADO'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-input'
              }`}
            >
              Parcelado
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Valor emprestado</Label>
          <MoneyInput
            value={valorOriginalStr}
            onChange={(str, raw) => {
              setValorOriginalStr(str);
              setValorOriginal(raw);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>% Juros</Label>
            <Input
              type="number"
              step="0.01"
              value={percentualJuros}
              onChange={(e) => setPercentualJuros(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>% Juros/dia atraso</Label>
            <Input
              type="number"
              step="0.01"
              value={percentualJurosAtraso}
              onChange={(e) => setPercentualJurosAtraso(e.target.value)}
            />
          </div>
        </div>

        {tipo === 'A_VISTA' && (
          <div className="space-y-2">
            <Label>Data de vencimento</Label>
            <Input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
            />
          </div>
        )}

        {tipo === 'PARCELADO' && (
          <div className="space-y-3">
            <Label>Parcelas</Label>
            {parcelas.map((p, idx) => (
              <div key={idx} className="space-y-3 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Parcela {p.numero}</span>
                  {parcelas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerParcela(idx)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Valor</Label>
                  <MoneyInput
                    value={p.valorStr}
                    onChange={(str, raw) => {
                      const ps = [...parcelas];
                      ps[idx].valorStr = str;
                      ps[idx].valor = raw;
                      setParcelas(ps);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Vencimento</Label>
                  <Input
                    type="date"
                    value={p.dataVencimento}
                    onChange={(e) => {
                      const ps = [...parcelas];
                      ps[idx].dataVencimento = e.target.value;
                      setParcelas(ps);
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={adicionarParcela}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> Adicionar parcela
            </button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="obs">Observação (opcional)</Label>
          <Input
            id="obs"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: pra pagar dia 10"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar empréstimo'}
        </button>
      </form>
    </>
  );
}
