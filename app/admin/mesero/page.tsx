import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { WaiterManager } from '@/components/waiter/waiter-manager';

export default async function WaiterPage(props: {
  searchParams: Promise<{ tableId?: string }>;
}) {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        No tienes permisos para acceder a la toma de comandas.
      </div>
    );
  }

  const { tableId } = await props.searchParams;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#f3a806]">Servicio en Sala & Caja</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Comandero & Toma de Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toma pedidos al instante, asigna a mesas y cobra inmediatamente antes o después de servir. Funciona incluso sin conexión.
        </p>
      </div>

      <WaiterManager restaurantId={staff.restaurantId} waiterId={staff.id} initialTableId={tableId} />
    </div>
  );
}
