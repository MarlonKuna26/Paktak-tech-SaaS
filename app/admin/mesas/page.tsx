import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { TableManager } from '@/components/tables/table-manager';

export const metadata = {
  title: 'Mesas & Salón | Paktak Tech',
};

export default async function TablesAdminPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'host', 'waiter', 'cashier'].includes(staff.role)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
        No tienes permisos para acceder a la gestión de mesas del salón.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#f3a806]">
          Salón & Servicio
        </span>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          Mesas & Comandas
        </h1>
        <p className="text-xs text-zinc-500 max-w-xl">
          Visualiza en tiempo real el plano de mesas, estado de ocupación, cobro de cuentas y asignación de salón.
        </p>
      </div>

      <TableManager restaurantId={staff.restaurantId} userRole={staff.role} />
    </div>
  );
}
