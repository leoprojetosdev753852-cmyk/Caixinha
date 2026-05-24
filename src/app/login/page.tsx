'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, LogIn } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { Toaster, useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const setSession = useAuthStore((s) => s.setSession);

  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!identificador.trim() || !senha) {
      setErro('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: identificador.trim(), senha }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.message || 'Erro ao fazer login');
        return;
      }

      const data = await res.json();
      setSession(data.accessToken, data.user);
      toast.success('Bem-vindo!');
      router.push(data.user.role === 'ADMIN' ? '/dashboard' : '/home');
    } catch (err) {
      console.error(err);
      setErro('Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Toaster />
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <LogIn className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Caixinha</h1>
          <p className="text-sm text-muted-foreground">Entre com seu CPF ou usuário</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="id">CPF ou usuário</Label>
            <Input
              id="id"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="000.000.000-00 ou admcaixa"
              autoCapitalize="none"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <Input
                id="senha"
                type={verSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setVerSenha(!verSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {erro && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !identificador.trim() || !senha}
            className="flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/primeiro-acesso" className="text-primary hover:underline">
            Primeiro acesso?
          </Link>
        </p>
      </div>
    </div>
  );
}
