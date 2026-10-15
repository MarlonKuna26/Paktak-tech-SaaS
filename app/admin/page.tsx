export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Panel de administración</p>
        <h1 className="text-3xl font-semibold tracking-tight">Resumen</h1>
      </div>
      <section className="rounded-xl border bg-card p-6">
        <p className="text-muted-foreground">
          Selecciona una opción del menú para comenzar a gestionar tu restaurante.
        </p>
      </section>
    </div>
  );
}
