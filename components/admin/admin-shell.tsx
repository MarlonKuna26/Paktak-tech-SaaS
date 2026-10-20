import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';

export async function AdminShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect('/auth/login?error=Tu%20usuario%20no%20tiene%20un%20restaurante%20activo');
  }

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <AdminSidebar staff={staff} />
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Banner de Suscripción / Período de Prueba */}
        {staff.isTrialExpired ? (
          <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>
                Tu período de prueba de 14 días ha expirado. Comunícate con soporte para activar tu suscripción y seguir operando sin cortes.
              </span>
            </div>
            <a
              href="https://wa.me/593999999999?text=Hola,%20deseo%20activar%20mi%20suscripción%20de%20Paktak%20Tech"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white text-rose-700 px-3 py-1 font-black hover:bg-zinc-100 text-[11px] shrink-0 ml-3"
            >
              Renovar Plan
            </a>
          </div>
        ) : staff.status === 'trial' ? (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs flex items-center justify-between text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <span>⏳</span>
              <span>
                <strong>Prueba Gratuita:</strong> Te quedan <strong>{staff.daysRemaining} días</strong> de acceso completo a todas las funciones.
              </span>
            </div>
            <Link
              href="/#precios"
              className="text-[11px] font-bold text-amber-900 dark:text-amber-200 underline hover:no-underline"
            >
              Ver Planes ↗
            </Link>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
