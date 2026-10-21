import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { StaffManager } from '@/components/staff/staff-manager';

export const metadata = {
  title: 'Personal & Empleados | Paktak Tech',
};

export default async function PersonalPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin'].includes(staff.role)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
        No tienes permisos para gestionar el personal del restaurante.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#f3a806]">
          Equipo de Trabajo
        </span>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          Personal & Empleados
        </h1>
        <p className="text-xs text-zinc-500 max-w-xl">
          Administra quién atiende tu restaurante. Registra meseros, cocineros, cajeros y administradores con credenciales directas y asignación de roles.
        </p>
      </div>

      <StaffManager />
    </div>
  );
}
