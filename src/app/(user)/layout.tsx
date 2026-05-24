import { BottomNav } from '@/components/layouts/bottom-nav';
import { SessionGuard } from '@/components/session-guard';
import { Toaster } from '@/components/ui/toast';

const navItems = [
  { href: '/home', label: 'Início', icon: 'home' as const },
  { href: '/minhas-caixinhas', label: 'Caixinhas', icon: 'piggy' as const },
  { href: '/meus-emprestimos', label: 'Empréstimos', icon: 'hand' as const },
  { href: '/perfil', label: 'Perfil', icon: 'user' as const },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard requiredRole="USER">
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-md pb-20">{children}</main>
        <BottomNav items={navItems} />
        <Toaster />
      </div>
    </SessionGuard>
  );
}