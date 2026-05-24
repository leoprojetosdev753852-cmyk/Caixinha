'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IMaskInput } from 'react-imask';
import { Loader2, ChevronRight, Eye, EyeOff, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Input, Label } from '@/components/ui/input';
import { useToast, Toaster } from '@/components/ui/toast';
import { limparCPF, formatarCPF, validarCPF } from '@/shared';

const TIPOS_PIX = [
  { value: 'CPF', label: 'CPF' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave aleatoria' },
] as const;

type TipoPix = (typeof TIPOS_PIX)[number]['value'];

function PrimeiroAcessoContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const setSession = useAuthStore((s) => s.setSession);

  const conviteId = sp.get('convite');
  const cpfQuery = sp.get('cpf');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [precisaCpf, setPrecisaCpf] = useState(false);
  const [cpf, setCpf] = useState(cpfQuery ? formatarCPF(cpfQuery) : '');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [tipoChavePix, setTipoChavePix] = useState<TipoPix>('CPF');
  const [chavePix, setChavePix] = useState('');
  const [aceiteTermos, setAceiteTermos] = useState(false);

  useEffect(() => {
    const verificar = async () => {
      try {
        let body: any;
        if (conviteId) {
          body = { convite: conviteId };
        } else if (cpfQuery) {
          body = { cpf: cpfQuery };
        } else {
          setStep(0);
          return;
        }

        const res = await fetch('/api/auth/check-cpf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setErro(err.message || 'Link de acesso invalido');
          setStep(-1);
          return;
        }

        const data = await res.json();

        if (data.perfilCompleto) {
          toast.success('Cadastro ja finalizado. Faca login.');
          router.push('/login');
          return;
        }

        setUsuarioId(data.usuarioId);
        setNomeCompleto(data.nomeCompleto || '');
        setPrecisaCpf(!!data.precisaCpf);
        setStep(1);
      } catch (err) {
        console.error(err);
        setErro('Erro ao verificar acesso');
        setStep(-1);
      }
    };
    verificar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (step === -1) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-destructive">{erro}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-sm font-medium text-primary underline"
          >
            Ir para login
          </button>
        </div>
      </div>
    );
  }

  if (step === 0) {
    const handleBuscar = async () => {
      const cpfLimpo = limparCPF(cpf);
      if (!validarCPF(cpfLimpo)) {
        setErro('CPF invalido');
        return;
      }
      setLoading(true);
      setErro(null);
      try {
        const res = await fetch('/api/auth/check-cpf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpf: cpfLimpo }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setErro(err.message || 'CPF nao encontrado');
          return;
        }
        const data = await res.json();
        if (data.perfilCompleto) {
          toast.success('Cadastro ja finalizado. Faca login.');
          router.push('/login');
          return;
        }
        setUsuarioId(data.usuarioId);
        setNomeCompleto(data.nomeCompleto || '');
        setStep(1);
      } catch {
        setErro('Erro ao verificar CPF');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Toaster />
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-center text-xl font-bold">Primeiro acesso</h1>
          <p className="text-center text-sm text-muted-foreground">Digite seu CPF para comecar</p>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <IMaskInput
              id="cpf"
              mask="000.000.000-00"
              value={cpf}
              onAccept={(v: string) => setCpf(v)}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="flex h-12 w-full rounded-md border border-input bg-background px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <button
            onClick={handleBuscar}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continuar'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 1 && !usuarioId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalSteps = precisaCpf ? 4 : 3;

  const handleProximo = () => {
    setErro(null);
    setStep(step + 1);
  };

  const handleVoltar = () => {
    setErro(null);
    setStep(step - 1);
  };

  const handleFinalizar = async () => {
    if (!aceiteTermos) {
      setErro('Aceite os termos para continuar');
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const body: any = {
        senha,
        confirmacaoSenha,
        tipoChavePix,
        chavePix: chavePix.trim(),
        aceiteTermos: true,
        cpf: limparCPF(cpf),
      };
      if (conviteId) {
        body.convite = conviteId;
      }

      const res = await fetch('/api/auth/first-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErro(err.message || 'Erro ao finalizar cadastro');
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

  const showCpfStep = precisaCpf && step === 1;
  const showSenhaStep = precisaCpf ? step === 2 : step === 1;
  const showPixStep = precisaCpf ? step === 3 : step === 2;
  const showConfirmStep = precisaCpf ? step === 4 : step === 3;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Toaster />
      <div className="w-full max-w-sm space-y-4">
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-bold">Ola, {nomeCompleto.split(' ')[0]}!</h1>
          <p className="text-sm text-muted-foreground">
            Passo {Math.min(step, totalSteps)} de {totalSteps}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </header>

        {showCpfStep && (
          <div className="space-y-3">
            <p className="text-sm">Confirme seu CPF</p>
            <IMaskInput
              mask="000.000.000-00"
              value={cpf}
              onAccept={(v: string) => setCpf(v)}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="flex h-12 w-full rounded-md border border-input bg-background px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <button
              onClick={() => {
                if (!validarCPF(limparCPF(cpf))) {
                  setErro('CPF invalido');
                  return;
                }
                handleProximo();
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-base font-medium text-primary-foreground"
            >
              Continuar <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {showSenhaStep && (
          <div className="space-y-3">
            <p className="text-sm">Crie uma senha (minimo 8 caracteres)</p>
            <div className="relative">
              <Input
                type={verSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setVerSenha(!verSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              type={verSenha ? 'text' : 'password'}
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
              placeholder="Confirme a senha"
            />
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleVoltar}
                className="flex h-12 flex-1 items-center justify-center rounded-md border border-input text-base"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  if (senha.length < 8) {
                    setErro('Senha deve ter minimo 8 caracteres');
                    return;
                  }
                  if (senha !== confirmacaoSenha) {
                    setErro('Senhas nao conferem');
                    return;
                  }
                  handleProximo();
                }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-base font-medium text-primary-foreground"
              >
                Continuar <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {showPixStep && (
          <div className="space-y-3">
            <p className="text-sm">Configure sua chave PIX (para receber pagamentos)</p>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_PIX.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTipoChavePix(t.value)}
                  className={`flex h-11 items-center justify-center rounded-md border-2 text-sm font-medium ${
                    tipoChavePix === t.value ? 'border-primary bg-primary/5 text-primary' : 'border-input'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Input
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder={
                tipoChavePix === 'CPF'
                  ? '000.000.000-00'
                  : tipoChavePix === 'EMAIL'
                    ? 'voce@email.com'
                    : tipoChavePix === 'TELEFONE'
                      ? '(00) 00000-0000'
                      : 'Cole sua chave'
              }
            />
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleVoltar}
                className="flex h-12 flex-1 items-center justify-center rounded-md border border-input text-base"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  if (!chavePix.trim()) {
                    setErro('Informe a chave PIX');
                    return;
                  }
                  handleProximo();
                }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-base font-medium text-primary-foreground"
              >
                Continuar <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {showConfirmStep && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Confirme seus dados</p>
            <div className="space-y-2 rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium">{nomeCompleto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPF</span>
                <span className="font-medium">{cpf}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PIX</span>
                <span className="font-medium">
                  {TIPOS_PIX.find((t) => t.value === tipoChavePix)?.label}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">Chave</span>
                <span className="break-all text-right font-medium">{chavePix}</span>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={aceiteTermos}
                onChange={(e) => setAceiteTermos(e.target.checked)}
                className="mt-0.5"
              />
              <span>Confirmo que os dados acima estao corretos</span>
            </label>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleVoltar}
                className="flex h-12 flex-1 items-center justify-center rounded-md border border-input text-base"
              >
                Voltar
              </button>
              <button
                onClick={handleFinalizar}
                disabled={loading || !aceiteTermos}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-base font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Concluir
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrimeiroAcessoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PrimeiroAcessoContent />
    </Suspense>
  );
}