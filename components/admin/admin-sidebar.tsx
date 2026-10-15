import Link from 'next/link';
import { LogoutButton } from '@/components/admin/logout-button';
import type { CurrentStaff, StaffRole } from '@/lib/auth/get-current-staff';

const navigation: ReadonlyArray<{
  href: string;
  label: string;
  roles: readonly StaffRole[];
}> = [
  { href: '/admin', label: 'Resumen', roles: ['owner', 'admin', 'host', 'waiter', 'kitchen'] },
  { href: '/admin/mesas', label: 'Mesas', roles: ['owner', 'admin', 'host', 'waiter'] },
  { href: '/admin/menu', label: 'Menú', roles: ['owner', 'admin'] },
  { href: '/admin/cocina', label: 'Cocina', roles: ['owner', 'admin', 'kitchen'] },
  { href: '/admin/mesero', label: 'Mesero', roles: ['owner', 'admin', 'waiter'] },
  { href: '/admin/pedidos', label: 'Pedidos', roles: ['owner', 'admin', 'kitchen'] },
  { href: '/admin/ajustes', label: 'Ajustes', roles: ['owner', 'admin'] },
];

export function AdminSidebar({ staff }: { staff: CurrentStaff }) {
  const items = navigation.filter((item) => item.roles.includes(staff.role));

  return (
    <aside className="flex w-full flex-col border-b bg-card p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-6">
        <p className="text-lg font-semibold">Paktak Tech</p>
        <p className="truncate text-sm text-muted-foreground">{staff.restaurantName}</p>
        <p className="text-xs capitalize text-muted-foreground">Rol: {staff.role}</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto md:flex-col">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 md:mt-auto">
        <LogoutButton />
      </div>
    </aside>
  );
}
