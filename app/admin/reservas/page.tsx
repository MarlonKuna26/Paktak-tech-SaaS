import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { ReservationManager } from '@/components/reservations/reservation-manager';

export default async function ReservasPage() {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
    return (
      <p className="rounded-md bg-destructive/10 p-4 text-destructive">
        No tienes permisos para gestionar reservas.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Operación</p>
        <h1 className="text-3xl font-semibold tracking-tight">Reservas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona y confirma las reservas de tu restaurante. Usa el botón de WhatsApp para contactar al cliente con un mensaje prellenado.
        </p>
      </div>
      <ReservationManager restaurantId={staff.restaurantId} />
    </div>
  );
}
