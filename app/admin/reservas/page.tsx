import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { ReservationManager } from '@/components/reservations/reservation-manager';

export default async function ReservasPage() {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host', 'cashier'].includes(staff.role)) {
    return (
      <p className="rounded-md bg-destructive/10 p-4 text-destructive">
        No tienes permisos para gestionar reservas.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 font-sans">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#EAA228]">Operación & Agenda</span>
        <h1 className="text-3xl font-black tracking-tight text-[#181C20]">Libro de Reservas</h1>
        <p className="text-xs text-[#666E7A] max-w-xl">
          Gestiona y confirma las reservas de tu restaurante. Contacta al cliente por WhatsApp con mensaje prellenado y actualiza el estado en vivo.
        </p>
      </div>
      <ReservationManager restaurantId={staff.restaurantId} />
    </div>
  );
}

