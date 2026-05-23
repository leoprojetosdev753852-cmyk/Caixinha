export default function DashboardPage() {
  return (
    <div className="space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Olá, administrador</p>
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Caixinhas ativas" valor="—" />
        <KpiCard label="Pontos em aberto" valor="—" />
        <KpiCard label="Empréstimos ativos" valor="—" />
        <KpiCard label="Valor a receber" valor="—" />
      </div>

      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Os números aparecem aqui assim que a Fase 2 (Caixinhas) e Fase 3 (Empréstimos) forem
        implementadas.
      </div>
    </div>
  );
}

function KpiCard({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{valor}</p>
    </div>
  );
}
