'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header } from '@/components/layouts/header';
import { Input, Label } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { toInputDate } from '@/lib/date';

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
  status: string;
}

interface PageProps {
  params: { id: string };
}

export default function EditarEmprestimoPage({ params }: PageProps) {
  const id = params.id;
  const router = useRouter();
  const toast = useToast();

  const [loadingInicial, setLoadingInicial] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nomeDevedor, setNomeDevedor] = useState('');
  const [pixDevedor, setPixDevedor] = useState('');
  const [observacao, setObservacao] = useState('');
  const [valorStr, setValorStr] = useState('');
  const [valorRaw, setValorRaw] = useState(0);
  const [percentualJuros, setPercentualJuros] = useState('');
  const [percentualJurosAtraso, setPercentualJurosAtraso] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [tipo, setTipo] = useState<'A_VISTA' | 'PARCELADO'>('A_VISTA');

  useEffect(() => {
    const carregar = async () => {
      try {
        const data = await apiFetch<Emprestimo>(`/api/admin/emprestimos/${id}`);
        setNomeDevedor(data.nomeDevedor);
        setPixDevedor(data.pixDevedor || '');
        setObservacao(data.observacao || '');
        setValorRaw(data.valorOriginal);
        setValorStr((data.valorOriginal / 100).toFixed(2).replace('.', ','));
        setPercentualJuros(String(data.percentualJuros));
        setPercentualJurosAtraso(String(data.percentualJurosAtraso));
        setDataVencimento(data.dataVencimento ? toInputDate(data.dataVencimento) : '');
        setTipo(data.tipo);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Erro');
        router.push('/emprestimos');
      } finally {
        setLoadingInicial(false);
      }
    };
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nomeDevedor.trim().length < 2) {
      toast.error('Nome muito curto');
      return;
    }
    if (valorRaw <= 0) {
      toast.error('Valor inválido');
      return;
    }

    setSalvando(true);
    try {
      const body: any = {
        nomeDevedor: nomeDevedor.trim(),
        pixDevedor: pixDevedor.trim() || null,
        observacao: observacao.trim() || null,
        valorOriginal: valorRaw,
        percentualJuros: Number(percentualJuros),
        percentualJurosAtraso: Number(percentualJurosAtraso),
      };
      if (tipo === 'A_VISTA') {
        body.dataVencimento = dataVencimento || null;
      }

      await apiFetch(`/api/admin/emprestimos/${id}`, {
        method: 'PATCH',
        body,
      });

      toast.success('Empréstimo atualizado!');
      router.push(`/emprestimos/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  };

  if (loadingInicial) {
    return (
      <>
        <Header title="Carregando..." showBack />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Editar empréstimo" showBack />

      <form onSubmit={handleSalvar} className="space-y-5 px-4 py-4">
        <div className="space-y-2">
          <Label>Nome do devedor</Label>
          <Input value={nomeDevedor} onChange={(e) => setNomeDevedor(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>PIX do devedor (opcional)</Label>
          <Input value={pixDevedor} onChange={(e) => setPixDevedor(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Valor emprestado</Label>
          <MoneyInput
            value={valorStr}
            onChange={(str, raw) => {
              setValorStr(str);
              setValorRaw(raw);
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
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            ℹ️ Edição de parcelas individuais não está disponível aqui. Pra mudar parcelas, exclua e crie um novo empréstimo.
          </div>
        )}

        <div className="space-y-2">
          <Label>Observação</Label>
          <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-base font-medium text-primary-foreground disabled:opacity-50"
        >
          {salvando ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4" /> Salvar alterações
            </>
          )}
        </button>
      </form>
    </>
  );
}
