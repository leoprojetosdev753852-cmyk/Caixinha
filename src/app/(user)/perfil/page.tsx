'use client';

import { useEffect, useState } from 'react';
import { Loader2, KeyRound, Save } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header, LogoutButton } from '@/components/layouts/header';
import { Input, Label } from '@/components/ui/input';
import { formatarCPF } from '@/shared';

const TIPOS_PIX = [
  { value: 'CPF', label: 'CPF' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave aleatória' },
] as const;

type TipoPix = (typeof TIPOS_PIX)[number]['value'];

interface Me {
  id: string;
  nomeCompleto: string;
  cpf: string;
  role: 'ADMIN' | 'USER';
  perfilCompleto: boolean;
  tipoChavePix: TipoPix | null;
  chavePix: string | null;
}

export default function PerfilPage() {
  const toast = useToast();

  const [me, setMe] = useState<Me | null>(null);
  const [tipoChavePix, setTipoChavePix] = useState<TipoPix>('CPF');
  const [chavePix, setChavePix] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<Me>('/api/users/me')
      .then((data) => {
        setMe(data);
        if (data.tipoChavePix) setTipoChavePix(data.tipoChavePix);
        if (data.chavePix) setChavePix(data.chavePix);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : 'Erro'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSalvar = async () => {
    if (!chavePix.trim()) {
      toast.error('Digite a chave PIX');
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch<Me>('/api/users/me', {
        method: 'PATCH',
        body: { tipoChavePix, chavePix: chavePix.trim() },
      });
      setMe(data);
      toast.success('PIX atualizado!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Perfil" />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!me) return null;

  return (
    <>
      <Header title="Meu perfil" rightSlot={<LogoutButton />} />

      <div className="space-y-4 px-4 py-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="text-right font-medium">{me.nomeCompleto}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">CPF</dt>
              <dd className="font-medium">{formatarCPF(me.cpf)}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Chave PIX</h3>
          </div>

          <div className="space-y-2">
            <Label>Tipo de chave</Label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_PIX.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => setTipoChavePix(tipo.value)}
                  className={`flex h-12 items-center justify-center rounded-md border-2 px-4 text-sm font-medium transition ${
                    tipoChavePix === tipo.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-input bg-background hover:bg-accent'
                  }`}
                >
                  {tipo.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chave-pix">Chave</Label>
            <Input
              id="chave-pix"
              type="text"
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder={
                tipoChavePix === 'CPF'
                  ? '000.000.000-00'
                  : tipoChavePix === 'EMAIL'
                    ? 'voce@email.com'
                    : tipoChavePix === 'TELEFONE'
                      ? '(00) 00000-0000'
                      : 'Cole sua chave aleatória'
              }
            />
          </div>

          <button
            onClick={handleSalvar}
            disabled={saving || !chavePix.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-base font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" /> Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
