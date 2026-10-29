import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { ReportTabsView } from '@/components/reports/report-tabs-view';

export const metadata = {
  title: 'Reportes y Cierre de Ventas | Paktak Tech',
};

export default async function ReportesPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
        No tienes permisos para acceder al módulo de reportes y arqueo de caja.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-black uppercase tracking-wider text-[#EAA228]">
          Finanzas & Operación
        </span>
        <h1 className="text-3xl font-black tracking-tight text-[#181C20]">
          Cierre de Caja & Reportes
        </h1>
        <p className="text-xs text-[#666E7A] max-w-xl">
          Control diario de turnos de cajeras, arqueo de gaveta con cálculo de sobrante/faltante, y reportes financieros con márgenes de ganancia.
        </p>
      </div>

      <ReportTabsView staff={staff} />
    </div>
  );
}
