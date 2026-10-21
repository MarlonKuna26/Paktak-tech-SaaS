import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { WaiterManager } from '@/components/waiter/waiter-manager';

export default async function WaiterPage(props: {
  searchParams: Promise<{ tableId?: string }>;
}) {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'waiter'].includes(staff.role)) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        No tienes permisos para acceder a la app de meseros.
      </div>
    );
  }

  const { tableId } = await props.searchParams;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Servicio en Sala</p>
        <h1 className="text-3xl font-bold tracking-tight">App del Mesero (Offline-First)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toma comandas al instante. Si se corta el Wi-Fi, tus órdenes se guardan en el teléfono y se sincronizan solas al reconectar.
        </p>
      </div>

      <WaiterManager restaurantId={staff.restaurantId} waiterId={staff.id} initialTableId={tableId} />
    </div>
  );
}
