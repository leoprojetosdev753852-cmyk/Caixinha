'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  UserCheck,
  UserX,
  Copy,
  Check,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Header } from '@/components/layouts/header';
import { formatarCPF } from '@/shared';

interface UsuarioDetalhe {
  id: string;
  nomeCompleto: string;
  cpf: string | null;
  ativo: boolean;
  perfilCompleto: boolean;
  tipoChavePix: string | null;
  chavePix: string | null;
  criadoEm: string;
}

const TIPOS_PIX_LABEL: Record<string, string> = {
  CPF: 'CPF',
  EMAIL: 'E-mail',
  TELEFONE: 'Telefone',
  ALEATORIA: 'Chave aleatória',
};

interface PageProps {
  params: { id: string };
}

export default function UsuarioDetalhePage({ params }: PageProps) {
  const id = params.id;
  const router = useRouter();
  const toast = useToast();

  const [usuario, setUsuario] = useState<UsuarioDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [acaoLoading, setAcaoLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [linkAcesso, setLinkAcesso] = useState('');

  const carregar = async () => {
    try {
      const data = await apiFetch<UsuarioDetalhe>(`/api/admin/usuarios/${id}`);
      setUsuario(data);
      if (typeof window !== 'undefined') {
        // Se tem CPF, link com cpf pré-preenchido
        // Se não tem CPF, link só pra /primeiro-acesso (user digita CPF lá)
        if (data.cpf) {
          setLinkAcesso(`${window.location.origin}/primeiro-acesso?cpf=${data.cpf}`);
        } else {
          // Usa ID do usuário como token de convite
          setLinkAcesso(`${window.location.origin}/primeiro-acesso?convite=${data.id}`);
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
      router.push('/usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleToggleAtivo = async () => {
    if (!usuario) return;
    setAcaoLoading(true);
    try {
      await apiFetch(`/api/admin/usuarios/${id}`, {
        method: 'PATCH',
        body: { ativo: !usuario.ativo },
      });
      toast.success(usuario.ativo ? 'Usuário desativado' : 'Usuário reativado');
      carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro');
    } finally {
      setAcaoLoading(false);
    }
  };

  const handleCopiarLink = async () => {
    if (!linkAcesso) return;
    try {
      await navigator.clipboard.writeText(linkAcesso);
      setCopiado(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Carregando..." showBack />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }
  if (!usuario) return null;

  return (
    <>
      <Header title="Detalhes" showBack />

      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              usuario.ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {usuario.ativo ? <UserCheck className="h-6 w-6" /> : <UserX className="h-6 w-6" />}
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="truncate font-semibold">{usuario.nomeCompleto}</h2>
            <p className="text-sm text-muted-foreground">
              {usuario.cpf ? formatarCPF(usuario.cpf) : 'Sem CPF cadastrado'}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
              usuario.ativo ? 'bg-emerald-100 text-emerald-900' : 'bg-muted text-muted-foreground'
            }`}
          >
            {usuario.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {!usuario.perfilCompleto && linkAcesso && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Cadastro pendente</p>
                <p className="text-xs">
                  {usuario.cpf
                    ? 'Compartilhe o link para o usuário criar a senha e cadastrar o PIX.'
                    : 'Usuário precisa fornecer CPF e cadastrar senha + PIX no primeiro acesso.'}
                </p>
              </div>
            </div>
            <div className="break-all rounded border border-amber-300 bg-white p-2 font-mono text-xs">
              {linkAcesso}
            </div>
            <button
              onClick={handleCopiarLink}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-amber-900 px-3 text-sm font-medium text-white hover:bg-amber-950"
            >
              {copiado ? (
                <>
                  <Check className="h-4 w-4" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar link
                </>
              )}
            </button>
          </div>
        )}

        {usuario.perfilCompleto && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Dados financeiros</h3>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Tipo PIX</dt>
                <dd className="font-medium">
                  {TIPOS_PIX_LABEL[usuario.tipoChavePix ?? ''] ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="shrink-0 text-muted-foreground">Chave PIX</dt>
                <dd className="break-all text-right font-medium">{usuario.chavePix}</dd>
              </div>
            </dl>
          </div>
        )}

        <button
          onClick={handleToggleAtivo}
          disabled={acaoLoading}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 px-4 text-sm font-medium transition disabled:opacity-50 ${
            usuario.ativo
              ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {acaoLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : usuario.ativo ? (
            <>
              <UserX className="h-4 w-4" /> Desativar usuário
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4" /> Reativar usuário
            </>
          )}
        </button>
      </div>
    </>
  );
}
