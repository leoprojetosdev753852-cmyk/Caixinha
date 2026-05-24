'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export function Header({ title, showBack, onBack, rightSlot }: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-2">
      {showBack && (
        <button
          onClick={handleBack}
          className="rounded-md p-2 hover:bg-accent"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="flex-1 truncate px-2 text-base font-semibold">{title}</h1>
      {rightSlot}
    </header>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignora
    }
    clearSession();
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-md p-2 hover:bg-accent"
      aria-label="Sair"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
