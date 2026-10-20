import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { DailyReportView } from '@/components/reports/daily-report-view';

export const metadata = {
  title: 'Reportes y Cierre de Ventas | Paktak Tech',
};

export default async function ReportesPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin'].includes(staff.role)) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        No tienes permisos para acceder al módulo de reportes y arqueo de ventas.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Finanzas & Operación</p>
          <h1 className="text-3xl font-bold tracking-tight">Cierre de Caja y Reportes Diarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualiza ventas consolidadas por fecha, desglose de métodos de pago, propinas y top de productos.
          </p>
        </div>
      </div>

      <DailyReportView restaurantName={staff.restaurantName} />
    </div>
  );
}
