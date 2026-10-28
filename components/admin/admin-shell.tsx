import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { AlertCircle, Clock, Sparkles } from 'lucide-react';

export async function AdminShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect('/auth/login?error=Tu%20usuario%20no%20tiene%20un%20restaurante%20activo');
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-[#FAF7F2] font-sans text-[#181C20] selection:bg-[#EAA228] selection:text-[#181C20]">
      <AdminSidebar staff={staff} />
      <div className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
        {/* Banner de Suscripción / Período de Prueba */}
        {staff.isTrialExpired ? (
          <div className="shrink-0 bg-rose-600 text-white px-4 sm:px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs z-10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
              <span>
                Tu período de prueba de 14 días ha expirado. Comunícate con soporte para activar tu suscripción y seguir operando sin cortes.
              </span>
            </div>
            <a
              href="https://wa.me/593999999999?text=Hola,%20deseo%20activar%20mi%20suscripción%20de%20Paktak%20Tech"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white text-rose-700 px-3.5 py-1 font-black hover:bg-zinc-100 text-[11px] shrink-0 ml-3"
            >
              Renovar Plan
            </a>
          </div>
        ) : staff.status === 'trial' ? (
          <div className="shrink-0 bg-[#FEF9EE] border-b border-[#F6E3B8] px-4 sm:px-6 py-2.5 text-xs flex items-center justify-between text-[#7A642B] z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-[#EAA228]" />
              <span>
                <strong>Prueba Gratuita:</strong> Te quedan <strong>{staff.daysRemaining} días</strong> de acceso completo a todas las funciones sin tarjeta.
              </span>
            </div>
            <Link
              href="/#precios"
              className="text-[11px] font-black text-[#181C20] bg-[#EAA228] px-3 py-1 rounded-full hover:bg-[#D99318] transition-colors"
            >
              Ver Planes ↗
            </Link>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
