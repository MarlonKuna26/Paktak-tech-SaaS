import { connection } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { CashShiftManager } from '@/components/shifts/cash-shift-manager';

export const metadata = {
  title: 'Turnos & Cuadre de Caja | Paktak Tech',
};

export const instant = false;

export default async function CajaAdminPage() {
  await connection();
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
        No tienes permisos para acceder al módulo de turnos y cuadre de caja.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-black uppercase tracking-wider text-[#EAA228]">
          Auditoría & Finanzas Diarias
        </span>
        <h1 className="text-3xl font-black tracking-tight text-[#181C20]">
          Turnos & Cuadre de Caja
        </h1>
        <p className="text-xs text-[#666E7A] max-w-xl">
          Control diario de turnos de cajeras por fecha: apertura con fondo inicial, recaudación en efectivo y arqueo con cálculo automático de faltante o sobrante.
        </p>
      </div>

      <CashShiftManager restaurantId={staff.restaurantId} userRole={staff.role} />
    </div>
  );
}
