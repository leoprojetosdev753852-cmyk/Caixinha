'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IMaskInput } from 'react-imask';
import { Loader2, Wallet, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { limparCPF, validarCPF } from '@caixinhas/shared';

type Step = 'cpf' | 'senha' | 'pix' | 'revisar';

const TIPOS_PIX = [
  { value: 'CPF', label: 'CPF' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave aleatória' },
] as const;

function PrimeiroAcessoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('cpf');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [cpf, setCpf] = useState(searchParams.get('cpf') ?? '');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [tipoChavePix, setTipoChavePix] =
    useState<(typeof TIPOS_PIX)[number]['value']>('CPF');
  const [chavePix, setChavePix] = useState('');
  const [confirmacao, setConfirmacao] = useState(false);

  useEffect(() => {
    const cpfQuery = searchParams.get('cpf');
    if (cpfQuery && validarCPF(cpfQuery)) {
      setStep('senha');
    }
  }, [searchParams]);

  const handleVerificarCpf = async () => {
    setErro(null);
    const cpfLimpo = limparCPF(cpf);

    if (!validarCPF(cpfLimpo)) {
      setErro('CPF inválido');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{
        existe: boolean;
        primeiroAcesso: boolean;
      }>('/api/auth/check-cpf', {
        method: 'POST',
        body: { cpf: cpfLimpo },
        skipAuth: true,
      });

      if (!result.existe) {
        setErro('CPF não cadastrado. Procure o administrador.');
        return;
      }
      if (!result.primeiroAcesso) {
        setErro('Este CPF já tem senha. Faça login normalmente.');
        return;
      }

      setStep('senha');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleProximoSenha = () => {
    setErro(null);
    if (senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(senha) || !/[a-z]/.test(senha) || !/[0-9]/.test(senha)) {
      setErro('A senha deve ter maiúscula, minúscula e número');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }
    setStep('pix');
  };

  const handleProximoPix = () => {
    setErro(null);
    if (!chavePix.trim()) {
      setErro('Informe sua chave PIX');
      return;
    }
    setStep('revisar');
  };

  const handleSubmit = async () => {
    setErro(null);
    if (!confirmacao) {
      setErro('Confirme que os dados estão corretos');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{
        accessToken: string;
        user: { id: string; cpf: string; role: 'ADMIN' | 'USER' };
      }>('/api/auth/first-access', {
        method: 'POST',
        body: {
          cpf: limparCPF(cpf),
          senha,
          confirmarSenha,
          tipoChavePix,
          chavePix: chavePix.trim(),
          confirmacaoDados: true,
        },
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

  const voltar = () => {
    setErro(null);
    if (step === 'senha') setStep('cpf');
    else if (step === 'pix') setStep('senha');
    else if (step === 'revisar') setStep('pix');
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-8">
      <div className="flex items-center gap-3">
        {step === 'cpf' ? (
          <Link href="/login" className="rounded-md p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : (
          <button onClick={voltar} className="rounded-md p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <span className="text-sm font-medium text-muted-foreground">
          Passo {step === 'cpf' ? 1 : step === 'senha' ? 2 : step === 'pix' ? 3 : 4} de 4
        </span>
      </div>

      <div className="mx-auto mt-8 w-full max-w-sm flex-1 space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Primeiro acesso</h1>
        </div>

        {step === 'cpf' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Digite seu CPF para começar.</p>
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
                className="flex h-12 w-full rounded-md border border-input bg-background px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {erro && <ErroBox mensagem={erro} />}
            <BotaoPrincipal onClick={handleVerificarCpf} loading={loading} disabled={!cpf}>
              Continuar
            </BotaoPrincipal>
          </div>
        )}

        {step === 'senha' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crie uma senha segura. Mínimo 8 caracteres com maiúscula, minúscula e número.
            </p>
            <div className="space-y-2">
              <label htmlFor="senha" className="text-sm font-medium">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                className="flex h-12 w-full rounded-md border border-input bg-background px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmar-senha" className="text-sm font-medium">
                Confirmar senha
              </label>
              <input
                id="confirmar-senha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                autoComplete="new-password"
                className="flex h-12 w-full rounded-md border border-input bg-background px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {erro && <ErroBox mensagem={erro} />}
            <BotaoPrincipal onClick={handleProximoSenha} disabled={!senha || !confirmarSenha}>
              Continuar
            </BotaoPrincipal>
          </div>
        )}

        {step === 'pix' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cadastre seu PIX. Será usado para receber pagamentos das caixinhas.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de chave</label>
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
              <label htmlFor="chave-pix" className="text-sm font-medium">
                Chave PIX
              </label>
              <input
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
                className="flex h-12 w-full rounded-md border border-input bg-background px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {erro && <ErroBox mensagem={erro} />}
            <BotaoPrincipal onClick={handleProximoPix} disabled={!chavePix.trim()}>
              Continuar
            </BotaoPrincipal>
          </div>
        )}

        {step === 'revisar' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-input bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Revise seus dados
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">CPF</dt>
                  <dd className="font-medium">{cpf}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tipo PIX</dt>
                  <dd className="font-medium">
                    {TIPOS_PIX.find((t) => t.value === tipoChavePix)?.label}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Chave PIX</dt>
                  <dd className="break-all text-right font-medium">{chavePix}</dd>
                </div>
              </dl>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input bg-card p-4">
              <input
                type="checkbox"
                checked={confirmacao}
                onChange={(e) => setConfirmacao(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm">
                Confirmo que os dados acima estão corretos. Estou ciente de que serão visíveis
                ao administrador para realizar pagamentos.
              </span>
            </label>

            {erro && <ErroBox mensagem={erro} />}

            <BotaoPrincipal onClick={handleSubmit} loading={loading} disabled={!confirmacao}>
              Concluir cadastro
            </BotaoPrincipal>
          </div>
        )}
      </div>
    </div>
  );
}

function ErroBox({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {mensagem}
    </div>
  );
}

function BotaoPrincipal({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </button>
  );
}

export default function PrimeiroAcessoPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <PrimeiroAcessoForm />
    </Suspense>
  );
}
