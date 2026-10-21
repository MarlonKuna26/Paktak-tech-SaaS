import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { KdsBoard } from '@/components/kds/kds-board';

export const metadata = {
  title: 'KDS Cocina & Barra | Paktak',
};

export default async function KitchenPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'kitchen'].includes(staff.role)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-base font-bold text-ink">
        No tienes permisos para acceder a la pantalla de cocina y barra.
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-8">
      <KdsBoard restaurantId={staff.restaurantId} />
    </div>
  );
}
