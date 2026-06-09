'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, HandCoins } from 'lucide-react';

const ITEMS_ADMIN = [
  { href: '/dashboard', label: 'Início', icon: Home, prefix: '/dashboard' },
  { href: '/emprestimos', label: 'Empréstimos', icon: HandCoins, prefix: '/emprestimos' },
];

const ITEMS_USER = [
  { href: '/home', label: 'Início', icon: Home, prefix: '/home' },
];

interface Props {
  role: 'ADMIN' | 'USER';
}

export function BottomNav({ role }: Props) {
  const pathname = usePathname() || '';
  const items = role === 'ADMIN' ? ITEMS_ADMIN : ITEMS_USER;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background">
      <div className="mx-auto flex max-w-md justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const ativo = pathname.startsWith(item.prefix);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 ${
                ativo ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
