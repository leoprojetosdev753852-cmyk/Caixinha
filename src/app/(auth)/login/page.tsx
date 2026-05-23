'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IMaskInput } from 'react-imask';
import { Loader2, Wallet } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { limparCPF, validarCPF } from '@/shared';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const cpfLimpo = limparCPF(cpf);

    if (!validarCPF(cpfLimpo)) {
      setErro('CPF inválido');
      return;
    }

    if (!senha) {
      setErro('Digite sua senha');
      return;
    }

    setLoading(true);
    try {
      const check = await apiFetch<{
        existe: boolean;
        primeiroAcesso: boolean;
      }>('/api/auth/check-cpf', {
        method: 'POST',
        body: { cpf: cpfLimpo },
        skipAuth: true,
      });

      if (!check.existe) {
        setErro('CPF não cadastrado. Procure o administrador.');
        return;
      }

      if (check.primeiroAcesso) {
        router.push(`/primeiro-acesso?cpf=${cpfLimpo}`);
        return;
      }

      const result = await apiFetch<{
        accessToken: string;
        user: { id: string; cpf: string; role: 'ADMIN' | 'USER'; nomeCompleto?: string };
      }>('/api/auth/login', {
        method: 'POST',
        body: { cpf: cpfLimpo, senha },
        skipAuth: true,
      });

      setSession(result.accessToken, result.user);
      router.push(result.user.role === 'ADMIN' ? '/dashboard' : '/home');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Caixinha</h1>
          <p className="text-sm text-muted-foreground">Entre com seu CPF e senha</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="cpf" className="text-sm font-medium">
              CPF
            </label>
            <IMaskInput
              id="cpf"
              mask="000.000.000-00"
              value={cpf}
              onAccept={(value: string) => setCpf(value)}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="username"
              className="flex h-12 w-full rounded-md border border-input bg-background px-4 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="senha" className="text-sm font-medium">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              className="flex h-12 w-full rounded-md border border-input bg-background px-4 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {erro && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !cpf || !senha}
            className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </button>

          <div className="text-center text-sm">
            <Link
              href="/primeiro-acesso"
              className="text-primary underline-offset-4 hover:underline"
            >
              Primeiro acesso?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
