import { BottomNav } from "@/components/layouts/bottom-nav";

const navItems = [
  { href: "/home", label: "Início", icon: "home" as const },
  { href: "/caixinhas", label: "Caixinhas", icon: "piggy" as const },
  { href: "/emprestimos", label: "Empréstimos", icon: "hand" as const },
  { href: "/perfil", label: "Perfil", icon: "user" as const },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md pb-20">{children}</main>
      <BottomNav items={navItems} />
    </div>
  );
}
