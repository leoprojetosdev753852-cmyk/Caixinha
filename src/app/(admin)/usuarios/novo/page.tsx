'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Input, Label } from '@/components/ui/input';
import { Header } from '@/components/layouts/header';

export default function NovoUsuarioPage() {
  const router = useRouter();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeLimpo = nome.trim();

    if (nomeLimpo.length < 3) {
      setErro('Digite o nome completo');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{
        usuario: { id: string; nomeCompleto: string };
      }>('/api/admin/usuarios', {
        method: 'POST',
        body: { nomeCompleto: nomeLimpo },
      });

      if (!result?.usuario?.id) {
        throw new Error('Resposta inválida da API');
      }

      toast.success(`${result.usuario.nomeCompleto} cadastrado!`);
      router.push(`/usuarios/${result.usuario.id}`);
    } catch (err) {
      let msg = 'Erro inesperado';
      if (err instanceof ApiError) {
        msg = err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErro(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Novo usuário" showBack />

      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-6">
        <div className="flex justify-center pb-2">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <UserPlus className="h-7 w-7" />
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Cadastro rápido. O usuário fornece CPF e cria senha no primeiro acesso.
        </p>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: João da Silva"
            autoComplete="name"
            autoFocus
          />
        </div>

        {erro && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || nome.trim().length < 3}
          className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Cadastrar usuário'}
        </button>
      </form>
    </>
  );
}
