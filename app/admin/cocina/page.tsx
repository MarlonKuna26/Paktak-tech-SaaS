import { getCurrentStaff } from '@/lib/auth/get-current-staff';

export default async function KitchenPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'kitchen'].includes(staff.role)) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        No tienes permisos para acceder a la pantalla de cocina.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              KDS Conectado
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Pantalla de Cocina & Barra</h1>
          <p className="text-sm text-muted-foreground">
            Módulo de comandas en preparación (Fase 7). Las órdenes tomadas por el mesero y desde mostrador se despacharán aquí.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          🍳
        </div>
        <h3 className="mt-4 text-lg font-semibold">Listo para vincular con la Fase 7</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          El módulo de cocina está conectado a las rutas seguras de tu restaurante ({staff.restaurantName}). En la siguiente fase se integrarán las tarjetas kanban en tiempo real.
        </p>
      </div>
    </div>
  );
}
