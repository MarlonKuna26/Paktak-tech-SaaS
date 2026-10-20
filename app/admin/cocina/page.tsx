import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { KdsBoard } from '@/components/kds/kds-board';

export default async function KitchenPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'kitchen'].includes(staff.role)) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        No tienes permisos para acceder a la pantalla de cocina y barra.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Operación en Línea</p>
          <h1 className="text-3xl font-bold tracking-tight">KDS Cocina & Barra</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Despacha las comandas de salón en tiempo real. Organizadas por orden de llegada con alertas de demora.
          </p>
        </div>
      </div>

      <KdsBoard restaurantId={staff.restaurantId} />
    </div>
  );
}
