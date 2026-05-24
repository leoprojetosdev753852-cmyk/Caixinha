"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  UserCheck,
  UserX,
  ChevronRight,
  Loader2,
  Users as UsersIcon,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToastStore } from "@/components/ui/toast";
import { formatarCPF } from "@/shared";
import { Header, LogoutButton } from "@/components/layouts/header";

interface Usuario {
  id: string;
  nomeCompleto: string;
  cpf: string;
  ativo: boolean;
  perfilCompleto: boolean;
}

export default function UsuariosListaPage() {
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (buscaAtual: string, filtroAtual: string) => {
    setLoading(true);
    setErro(null);
    try {
      const url = `/api/admin/usuarios?apenas=${filtroAtual}${
        buscaAtual ? `&busca=${encodeURIComponent(buscaAtual)}` : ""
      }`;
      const data = await apiFetch<{ usuarios: Usuario[] }>(url);
      setUsuarios(data.usuarios || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erro ao carregar usuários";
      setErro(msg);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      carregar(busca, filtro);
    }, 300);
    return () => clearTimeout(t);
  }, [busca, filtro, carregar]);

  return (
    <>
      <Header title="Usuários" rightSlot={<LogoutButton />} />

      <div className="space-y-4 px-4 py-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou CPF"
              className="flex h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Link
            href="/usuarios/novo"
            className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Novo usuário"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex gap-2">
          {[
            { v: "ativos", l: "Ativos" },
            { v: "inativos", l: "Inativos" },
            { v: "todos", l: "Todos" },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFiltro(f.v as any)}
              className={`flex-1 rounded-md border-2 px-3 py-1.5 text-sm font-medium transition ${
                filtro === f.v
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        {erro && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && usuarios.length === 0 && !erro && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
            <UsersIcon className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {busca ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
            </p>
            {!busca && (
              <Link
                href="/usuarios/novo"
                className="text-sm font-medium text-primary hover:underline"
              >
                Cadastrar o primeiro
              </Link>
            )}
          </div>
        )}

        {!loading && usuarios.length > 0 && (
          <div className="space-y-2">
            {usuarios.map((u) => (
              <button
                key={u.id}
                onClick={() => router.push(`/usuarios/${u.id}`)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:bg-accent"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    u.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {u.ativo ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{u.nomeCompleto}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatarCPF(u.cpf)}</span>
                    {!u.perfilCompleto && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">
                        Sem cadastro
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}