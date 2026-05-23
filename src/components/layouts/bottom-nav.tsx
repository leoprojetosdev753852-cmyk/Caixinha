"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  PiggyBank,
  HandCoins,
  Users,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  home: Home,
  dashboard: LayoutDashboard,
  piggy: PiggyBank,
  hand: HandCoins,
  users: Users,
  user: User,
} as const;

export type IconName = keyof typeof ICONS;

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const ativo =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href as any}
              className={cn(
                "flex h-16 min-w-[64px] flex-1 flex-col items-center justify-center gap-1 transition",
                ativo ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
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
