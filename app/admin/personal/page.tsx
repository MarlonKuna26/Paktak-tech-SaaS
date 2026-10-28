import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { StaffManager } from '@/components/staff/staff-manager';

export const metadata = {
  title: 'Personal & Empleados | Paktak Tech',
};

export default async function PersonalPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs font-bold text-red-700">
        No tienes permisos para gestionar el personal del restaurante.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#EAA228]">
          Equipo de Trabajo
        </span>
        <h1 className="text-3xl font-black tracking-tight text-[#181C20]">
          Personal & Empleados
        </h1>
        <p className="text-xs text-[#666E7A] max-w-xl">
          Administra quién atiende tu restaurante. Registra meseros, cocineros, cajeros y administradores con credenciales directas y asignación de roles.
        </p>
      </div>

      <StaffManager />
    </div>
  );
}

