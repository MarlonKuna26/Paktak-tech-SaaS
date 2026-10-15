import { OrderManager } from '@/components/orders/order-manager';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';

export default async function OrdersPage() {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'kitchen'].includes(staff.role)) {
    return <p className="rounded-md bg-destructive/10 p-4 text-destructive">No tienes permisos para gestionar pedidos.</p>;
  }
  return <div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm text-muted-foreground">Operación</p><h1 className="text-3xl font-semibold tracking-tight">Pedidos recibidos</h1></div><OrderManager restaurantId={staff.restaurantId} /></div>;
}
