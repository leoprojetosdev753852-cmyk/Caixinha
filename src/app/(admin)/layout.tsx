import { LayoutDashboard, PiggyBank, HandCoins, Users } from 'lucide-react';
import { BottomNav } from '@/components/layouts/bottom-nav';

const navItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/caixinhas', label: 'Caixinhas', icon: PiggyBank },
  { href: '/emprestimos', label: 'Empréstimos', icon: HandCoins },
  { href: '/usuarios', label: 'Usuários', icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md pb-20">{children}</main>
      <BottomNav items={navItems} />
    </div>
  );
}
