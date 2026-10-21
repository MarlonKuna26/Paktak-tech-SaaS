'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Calendar,
  BookOpen,
  ChefHat,
  ConciergeBell,
  ClipboardList,
  TrendingUp,
  Settings,
  Users,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { LogoutButton } from '@/components/admin/logout-button';
import type { CurrentStaff, StaffRole } from '@/lib/auth/get-current-staff';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly StaffRole[];
};

const roleLabelMap: Record<StaffRole, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  host: 'Anfitrión (Superusuario)',
  cashier: 'Cajero & Servicio',
  kitchen: 'Cocina & Chef',
  waiter: 'Cajero & Servicio',
};

const navigation: readonly NavItem[] = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, roles: ['owner', 'admin', 'host'] },
  { href: '/admin/mesas', label: 'Mesas & Salón', icon: UtensilsCrossed, roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/reservas', label: 'Reservas', icon: Calendar, roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/menu', label: 'Menú & Platos', icon: BookOpen, roles: ['owner', 'admin', 'host'] },
  { href: '/admin/personal', label: 'Equipo & Personal', icon: Users, roles: ['owner', 'admin', 'host'] },
  { href: '/admin/cocina', label: 'KDS Cocina', icon: ChefHat, roles: ['owner', 'admin', 'host', 'kitchen', 'cashier'] },
  { href: '/admin/mesero', label: 'Comandero & Pedidos', icon: ConciergeBell, roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/pedidos', label: 'Pedidos & Cobros', icon: ClipboardList, roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/reportes', label: 'Reportes & Cierre', icon: TrendingUp, roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/ajustes', label: 'Ajustes', icon: Settings, roles: ['owner', 'admin', 'host'] },
];

export function AdminSidebar({ staff }: { staff: CurrentStaff }) {
  const pathname = usePathname();
  const items = navigation.filter((item) => item.roles.includes(staff.role));

  return (
    <aside className="flex w-full flex-col border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r shadow-xs">
      {/* Brand & Restaurant Header */}
      <div className="mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-black text-[#f3a806] text-xs shadow-2xs">
            {staff.restaurantName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {staff.restaurantName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Rol: {roleLabelMap[staff.role] || staff.role}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Link to Public Store */}
        <div className="mt-3">
          <Link
            href={`/${staff.restaurantSlug}/pedir`}
            target="_blank"
            className="flex items-center justify-between rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <span>Ver Menú Digital</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
          </Link>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex gap-1 overflow-x-auto md:flex-col md:space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex items-center gap-3 whitespace-nowrap rounded-full px-3.5 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#f3a806] text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />
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
