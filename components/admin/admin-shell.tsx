import { connection } from 'next/server';
import { redirect } from 'next/navigation';
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
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
