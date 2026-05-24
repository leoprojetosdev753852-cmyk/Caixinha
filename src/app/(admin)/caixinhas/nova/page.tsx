'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Plus, PiggyBank } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Input, Label } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Header } from '@/components/layouts/header';
import { formatarBRL } from '@/shared';
import { toInputDate } from '@/lib/date';

interface PontoForm {
  numero: number;
  valor: number; // centavos
  valorStr: string;
  dataContemplacao: string; // YYYY-MM-DD
}

export default function NovaCaixinhaPage() {
  const router = useRouter();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [pontos, setPontos] = useState<PontoForm[]>([
    { numero: 1, valor: 0, valorStr: '', dataContemplacao: '' },
  ]);
  const [loading, setLoading] = useState(false);

  const adicionarPonto = () => {
    const proximoNumero = pontos.length > 0 ? Math.max(...pontos.map((p) => p.numero)) + 1 : 1;
    setPontos([...pontos, { numero: proximoNumero, valor: 0, valorStr: '', dataContemplacao: '' }]);
  };

  const removerPonto = (idx: number) => {
    if (pontos.length === 1) return;
    setPontos(pontos.filter((_, i) => i !== idx));
  };

  const atualizarPonto = (idx: number, campo: keyof PontoForm, value: any) => {
    const novos = [...pontos];
    (novos[idx] as any)[campo] = value;
    setPontos(novos);
  };

  const valorTotal = pontos.reduce((acc, p) => acc + p.valor, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nome.trim().length < 3) {
      toast.error('Dê um nome para a caixinha');
      return;
    }
    if (pontos.some((p) => p.valor <= 0)) {
      toast.error('Todo ponto precisa ter valor');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{ caixinha: { id: string } }>('/api/admin/caixinhas', {
        method: 'POST',
        body: {
          nome: nome.trim(),
          observacao: observacao.trim() || undefined,
          pontos: pontos.map((p) => ({
            numero: p.numero,
            valor: p.valor,
            dataContemplacao: p.dataContemplacao || undefined,
          })),
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
            placeholder="Ex: Caixinha de Janeiro 2026"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obs">Observação (opcional)</Label>
          <Input id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Pontos</Label>
            <span className="text-xs text-muted-foreground">Total: {formatarBRL(valorTotal)}</span>
          </div>

          {pontos.map((p, idx) => (
            <div key={idx} className="space-y-3 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Ponto {p.numero}</span>
                {pontos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerPonto(idx)}
                    className="rounded-md p-1 text-destructive hover:bg-destructive/10"
                    aria-label="Remover"
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
                    atualizarPonto(idx, 'valorStr', str);
                    atualizarPonto(idx, 'valor', raw);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Data de contemplação (opcional)</Label>
                <Input
                  type="date"
                  value={p.dataContemplacao}
                  onChange={(e) => atualizarPonto(idx, 'dataContemplacao', e.target.value)}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={adicionarPonto}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Adicionar ponto
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !nome || pontos.some((p) => p.valor <= 0)}
          className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar caixinha'}
        </button>
      </form>
    </>
  );
}
