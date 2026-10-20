'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/admin/logout-button';
import type { CurrentStaff, StaffRole } from '@/lib/auth/get-current-staff';

const navigation: ReadonlyArray<{
  href: string;
  label: string;
  icon: string;
  roles: readonly StaffRole[];
}> = [
  { href: '/admin', label: 'Resumen', icon: '📊', roles: ['owner', 'admin', 'host', 'waiter', 'kitchen'] },
  { href: '/admin/mesas', label: 'Mesas & Salón', icon: '🪑', roles: ['owner', 'admin', 'host', 'waiter'] },
  { href: '/admin/reservas', label: 'Reservas', icon: '📅', roles: ['owner', 'admin', 'host'] },
  { href: '/admin/menu', label: 'Menú & Platos', icon: '🍽️', roles: ['owner', 'admin'] },
  { href: '/admin/cocina', label: 'KDS Cocina', icon: '🍳', roles: ['owner', 'admin', 'kitchen'] },
  { href: '/admin/mesero', label: 'App Mesero', icon: '🤵', roles: ['owner', 'admin', 'waiter'] },
  { href: '/admin/pedidos', label: 'Pedidos en Vivo', icon: '📋', roles: ['owner', 'admin', 'kitchen'] },
  { href: '/admin/reportes', label: 'Reportes & Caja', icon: '📈', roles: ['owner', 'admin'] },
  { href: '/admin/ajustes', label: 'Ajustes', icon: '⚙️', roles: ['owner', 'admin'] },
];

export function AdminSidebar({ staff }: { staff: CurrentStaff }) {
  const pathname = usePathname();
  const items = navigation.filter((item) => item.roles.includes(staff.role));

  return (
    <aside className="flex w-full flex-col border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r shadow-xs">
      {/* Brand & Restaurant Header matching the mockups */}
      <div className="mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-800 border-2 border-[#f3a806] shadow-2xs font-black text-amber-500 text-xs">
            {staff.restaurantName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {staff.restaurantName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 capitalize">
                Rol: {staff.role}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Link to Public Store */}
        <div className="mt-3">
          <Link
            href={`/${staff.restaurantSlug}/pedir`}
            target="_blank"
            className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <span>Ver Menú Digital</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex gap-1 overflow-x-auto md:flex-col md:space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#f3a806] text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout and Footer */}
      <div className="mt-6 md:mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
        <LogoutButton />
        <p className="mt-3 text-[10px] text-center text-zinc-400">
          Paktak Tech SaaS · v1.0
        </p>
      </div>
    </aside>
  );
}
