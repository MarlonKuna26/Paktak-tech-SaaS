import { connection } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { TableManager } from '@/components/tables/table-manager';

export const metadata = {
  title: 'Caja, Salón & Órdenes | Paktak Tech',
};

export default async function TablesAdminPage(props: {
  searchParams?: Promise<{ tableId?: string; view?: 'tables' | 'comandero' | 'pedidos' }>;
}) {
  await connection();
  const staff = await getCurrentStaff();
  const searchParams = props.searchParams ? await props.searchParams : {};

  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
        No tienes permisos para acceder a la gestión de mesas del salón.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#f3a806]">
          Punto de Venta & Operación del Cajero
        </span>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          Caja, Salón & Órdenes
        </h1>
        <p className="text-xs text-zinc-500 max-w-xl">
          Los 3 módulos esenciales del cajero en una sola pantalla: plano de mesas en vivo, toma ágil de órdenes y cobros con arqueo diario.
        </p>
      </div>

      <TableManager
        restaurantId={staff.restaurantId}
        staffId={staff.id}
        userRole={staff.role}
        initialTableId={searchParams.tableId}
        initialView={searchParams.view}
      />
    </div>
  );
}
