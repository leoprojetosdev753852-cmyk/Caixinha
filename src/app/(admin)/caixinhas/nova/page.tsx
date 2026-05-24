'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PiggyBank, CalendarDays } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Input, Label } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Header } from '@/components/layouts/header';
import { formatarBRL } from '@/shared';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function NovaCaixinhaPage() {
  const router = useRouter();
  const toast = useToast();

  const hoje = new Date();

  const [nome, setNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [diaPagamento, setDiaPagamento] = useState('10');
  const [mesInicio, setMesInicio] = useState(String(hoje.getMonth() + 1));
  const [anoInicio, setAnoInicio] = useState(String(hoje.getFullYear()));
  const [quantidadePontos, setQuantidadePontos] = useState('10');
  const [valorTotalStr, setValorTotalStr] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const qtdPontos = Number(quantidadePontos) || 0;
  const valorPorPonto = useMemo(() => {
    if (qtdPontos <= 0 || valorTotal <= 0) return 0;
    return Math.floor(valorTotal / qtdPontos);
  }, [qtdPontos, valorTotal]);

  // Preview: gera as datas pra mostrar pro usuário
  const datasPreview = useMemo(() => {
    const dia = Number(diaPagamento);
    const mes = Number(mesInicio);
    const ano = Number(anoInicio);
    if (!dia || !mes || !ano || qtdPontos <= 0) return [];
    const datas: Date[] = [];
    for (let i = 0; i < qtdPontos; i++) {
      datas.push(new Date(ano, mes - 1 + i, dia));
    }
    return datas;
  }, [diaPagamento, mesInicio, anoInicio, qtdPontos]);

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
      toast.error('Defina o valor total');
      return;
    }
    const dia = Number(diaPagamento);
    if (dia < 1 || dia > 31) {
      toast.error('Dia entre 1 e 31');
      return;
    }
    const mes = Number(mesInicio);
    const ano = Number(anoInicio);
    if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
      toast.error('Mês/ano inválido');
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
          mesInicio: mes,
          anoInicio: ano,
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

  const anos = [];
  for (let y = 2020; y <= hoje.getFullYear() + 5; y++) anos.push(y);

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

        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Período</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Mês de início</Label>
              <select
                value={mesInicio}
                onChange={(e) => setMesInicio(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ano</Label>
              <select
                value={anoInicio}
                onChange={(e) => setAnoInicio(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {anos.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Dia do pagamento</Label>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="obs">Observação (opcional)</Label>
          <Input id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>

        {valorPorPonto > 0 && qtdPontos > 0 && datasPreview.length > 0 && (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Resumo</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Valor por ponto</dt>
                <dd className="font-semibold">{formatarBRL(valorPorPonto)} / mês</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duração</dt>
                <dd className="font-semibold">
                  {qtdPontos} {qtdPontos > 1 ? 'meses' : 'mês'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Início</dt>
                <dd className="font-semibold">
                  {datasPreview[0]?.toLocaleDateString('pt-BR')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fim</dt>
                <dd className="font-semibold">
                  {datasPreview[datasPreview.length - 1]?.toLocaleDateString('pt-BR')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Movimentação total</dt>
                <dd className="font-semibold">{formatarBRL(valorPorPonto * qtdPontos)}</dd>
              </div>
            </dl>
            {valorPorPonto * qtdPontos !== valorTotal && (
              <p className="text-xs text-amber-700">
                ⚠ Valor arredondado. Diferença: {formatarBRL(valorTotal - valorPorPonto * qtdPontos)}
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
