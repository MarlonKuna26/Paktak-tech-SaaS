import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { TableManager } from '@/components/tables/table-manager';

export default async function TablesAdminPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'host', 'waiter'].includes(staff.role)) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        No tienes permisos para acceder a la gestión de mesas del salón.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Operación en Vivo</p>
        <h1 className="text-3xl font-bold tracking-tight">Control de Salón y Mesas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitorea el estado en vivo de las mesas, sienta clientes y asigna reservas en tiempo real.
        </p>
      </div>

      <TableManager restaurantId={staff.restaurantId} userRole={staff.role} />
    </div>
  );
}
