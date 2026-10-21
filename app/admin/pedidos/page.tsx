import { OrderManager } from '@/components/orders/order-manager';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';

export const metadata = {
  title: 'Pedidos en Vivo | Paktak Tech',
};

export default async function OrdersPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return (
      <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-6 text-sm text-red-700 dark:text-red-400 font-medium">
        No tienes permisos para gestionar pedidos y cobros.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#f3a806]">
          Operación en Vivo
        </span>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          Pedidos Recibidos
        </h1>
        <p className="text-xs text-zinc-500 max-w-xl">
          Monitorea y atiende las órdenes públicas del menú digital y las comandas de salón en tiempo real.
        </p>
      </div>

      <OrderManager restaurantId={staff.restaurantId} />
    </div>
  );
}
