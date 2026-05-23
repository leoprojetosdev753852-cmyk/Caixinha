import { Home, PiggyBank, HandCoins, User } from 'lucide-react';
import { BottomNav } from '@/components/layouts/bottom-nav';

const navItems = [
  { href: '/home', label: 'Início', icon: Home },
  { href: '/caixinhas', label: 'Caixinhas', icon: PiggyBank },
  { href: '/emprestimos', label: 'Empréstimos', icon: HandCoins },
  { href: '/perfil', label: 'Perfil', icon: User },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md pb-20">{children}</main>
      <BottomNav items={navItems} />
    </div>
  );
}
