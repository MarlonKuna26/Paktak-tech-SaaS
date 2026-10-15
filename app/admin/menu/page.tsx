import { MenuManager } from '@/components/menu/menu-manager';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';

export default async function MenuPage() {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin'].includes(staff.role)) {
    return <p className="rounded-md bg-destructive/10 p-4 text-destructive">No tienes permisos para gestionar el menú.</p>;
  }
  return <div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm text-muted-foreground">Administración</p><h1 className="text-3xl font-semibold tracking-tight">Menú</h1></div><MenuManager restaurantId={staff.restaurantId} /></div>;
}
