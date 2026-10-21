import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { KdsBoard } from '@/components/kds/kds-board';

export const metadata = {
  title: 'KDS Cocina & Barra | Paktak Tech',
};

export default async function KitchenPage() {
  const staff = await getCurrentStaff();

  if (!staff || !['owner', 'admin', 'host', 'kitchen', 'cashier'].includes(staff.role)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">
        No tienes permisos para acceder a la pantalla de cocina y barra.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <KdsBoard restaurantId={staff.restaurantId} userRole={staff.role} />
    </div>
  );
}
