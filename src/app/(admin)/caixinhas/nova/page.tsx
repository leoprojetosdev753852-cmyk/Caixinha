'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PiggyBank } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Input, Label } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Header } from '@/components/layouts/header';
import { formatarBRL } from '@/shared';

export default function NovaCaixinhaPage() {
  const router = useRouter();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [diaPagamento, setDiaPagamento] = useState('10');
  const [quantidadePontos, setQuantidadePontos] = useState('10');
  const [valorTotalStr, setValorTotalStr] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const qtdPontos = Number(quantidadePontos) || 0;
  const valorPorPonto = useMemo(() => {
    if (qtdPontos <= 0 || valorTotal <= 0) return 0;
    return Math.floor(valorTotal / qtdPontos);
  }, [qtdPontos, valorTotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nome.trim().length < 3) {
      toast.error('Dê um nome para a caixinha');
      return;
    }
    if (qtdPontos < 1 || qtdPontos > 60) {
      toast.error('Quantidade entre 1 e 60 pontos');
      return;
    }
    if (valorTotal <= 0) {
      toast.error('Defina o valor total da caixinha');
      return;
    }
    const dia = Number(diaPagamento);
    if (dia < 1 || dia > 31) {
      toast.error('Dia entre 1 e 31');
      return;
    }
    if (valorPorPonto <= 0) {
      toast.error('Valor por ponto resultou em zero');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{ caixinha: { id: string } }>('/api/admin/caixinhas', {
        method: 'POST',
        body: {
          nome: nome.trim(),
          observacao: observacao.trim() || undefined,
          diaPagamento: dia,
          quantidadePontos: qtdPontos,
          valorTotal: valorTotal,
        },
      });
      toast.success('Caixinha criada!');
      router.push(`/caixinhas/${result.caixinha.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Nova caixinha" showBack />

      <form onSubmit={handleSubmit} className="space-y-5 px-4 py-4">
        <div className="flex justify-center pb-2">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <PiggyBank className="h-7 w-7" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome da caixinha</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Janeiro 2026"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="qtd">Quantidade de pontos</Label>
          <Input
            id="qtd"
            type="number"
            min="1"
            max="60"
            inputMode="numeric"
            value={quantidadePontos}
            onChange={(e) => setQuantidadePontos(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Cada ponto = 1 mês de duração. Ex: 10 pontos = ciclo de 10 meses.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Valor total da caixinha</Label>
          <MoneyInput
            value={valorTotalStr}
            onChange={(str, raw) => {
              setValorTotalStr(str);
              setValorTotal(raw);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dia">Dia de pagamento</Label>
          <Input
            id="dia"
            type="number"
            min="1"
            max="31"
            inputMode="numeric"
            value={diaPagamento}
            onChange={(e) => setDiaPagamento(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Dia do mês em que todos os cotistas pagam.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="obs">Observação (opcional)</Label>
          <Input id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>

        {/* Preview da divisão */}
        {valorPorPonto > 0 && qtdPontos > 0 && (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Resumo</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Valor por ponto</dt>
                <dd className="font-semibold">{formatarBRL(valorPorPonto)} / mês</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duração</dt>
                <dd className="font-semibold">{qtdPontos} {qtdPontos > 1 ? 'meses' : 'mês'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Movimentação total</dt>
                <dd className="font-semibold">{formatarBRL(valorPorPonto * qtdPontos)}</dd>
              </div>
            </dl>
            {valorPorPonto * qtdPontos !== valorTotal && (
              <p className="text-xs text-amber-700">
                ⚠ O valor por ponto foi arredondado. Diferença: {formatarBRL(valorTotal - valorPorPonto * qtdPontos)}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !nome || qtdPontos <= 0 || valorTotal <= 0}
          className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar caixinha'}
        </button>
      </form>
    </>
  );
}
