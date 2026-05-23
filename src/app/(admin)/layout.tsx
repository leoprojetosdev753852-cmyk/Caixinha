import { BottomNav } from "@/components/layouts/bottom-nav";

const navItems = [
  { href: "/dashboard", label: "Início", icon: "dashboard" as const },
  { href: "/caixinhas", label: "Caixinhas", icon: "piggy" as const },
  { href: "/emprestimos", label: "Empréstimos", icon: "hand" as const },
  { href: "/usuarios", label: "Usuários", icon: "users" as const },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md pb-20">{children}</main>
      <BottomNav items={navItems} />
    </div>
  );
}
