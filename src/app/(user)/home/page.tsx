export default function UserHomePage() {
  return (
    <div className="space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Bem-vindo</p>
        <h1 className="text-2xl font-bold">Minha conta</h1>
      </header>

      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Você verá aqui suas caixinhas e empréstimos quando o admin alocar você.
      </div>
    </div>
  );
}
