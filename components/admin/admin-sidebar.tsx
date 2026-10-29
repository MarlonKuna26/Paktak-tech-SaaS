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
  Wallet,
  TrendingUp,
  Settings,
  Users,
  ExternalLink,
  Store,
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
  { href: '/admin', label: 'Resumen Ejecutivo', icon: LayoutDashboard, roles: ['owner', 'admin', 'host'] },
  { href: '/admin/mesas', label: 'Caja, Salón & Órdenes', icon: UtensilsCrossed, roles: ['owner', 'admin', 'host', 'cashier', 'waiter'] },
  { href: '/admin/caja', label: 'Turnos & Cuadre de Caja', icon: Wallet, roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/menu', label: 'Menú & Platos', icon: BookOpen, roles: ['owner', 'admin', 'host'] },
  { href: '/admin/cocina', label: 'KDS Cocina', icon: ChefHat, roles: ['owner', 'admin', 'host', 'kitchen', 'cashier', 'waiter'] },
  { href: '/admin/reservas', label: 'Reservas', icon: Calendar, roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/personal', label: 'Equipo & Personal', icon: Users, roles: ['owner', 'admin', 'host'] },
  { href: '/admin/reportes', label: 'Reportes & Cierre', icon: TrendingUp, roles: ['owner', 'admin', 'host', 'cashier'] },
  { href: '/admin/ajustes', label: 'Ajustes', icon: Settings, roles: ['owner', 'admin', 'host'] },
];

export function AdminSidebar({ staff }: { staff: CurrentStaff }) {
  const pathname = usePathname();
  const items = navigation.filter((item) => item.roles.includes(staff.role));

  return (
    <aside className="flex w-full md:w-64 md:h-screen md:sticky md:top-0 shrink-0 flex-col justify-between border-b md:border-b-0 md:border-r border-[#262C34] bg-[#161A1E] text-white p-4 sm:p-5 shadow-sm overflow-hidden z-20">
      {/* Brand & Restaurant Header (Fixed top) */}
      <div className="shrink-0 mb-4 pb-4 border-b border-[#262C34]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAA228] text-[#181C20] font-black text-sm shadow-sm">
            {staff.restaurantName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-white">
              {staff.restaurantName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#28A745] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#8C95A3]">
                {roleLabelMap[staff.role] || staff.role}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Link to Public Store */}
        <div className="mt-3">
          <Link
            href={`/${staff.restaurantSlug}/pedir`}
            target="_blank"
            className="flex items-center justify-between rounded-xl border border-[#2D3540] bg-[#1E242B] px-3.5 py-2 text-xs font-bold text-[#EAA228] hover:bg-[#252C34] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5" />
              <span>Ver Menú Digital</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Navigation List (Scrollable internally if screen is short, but fits nicely) */}
      <nav className="flex-1 flex gap-1.5 overflow-x-auto md:flex-col md:overflow-y-auto md:space-y-1 py-1 no-scrollbar md:pr-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-[#EAA228] text-[#181C20] shadow-sm font-black'
                  : 'text-[#9DA7B3] hover:bg-[#20262E] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Staff Account & Logout Footer (Always anchored at bottom of sidebar) */}
      <div className="shrink-0 mt-3 md:mt-auto pt-3.5 border-t border-[#262C34] space-y-2">
        {/* User Card */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#1E242B]/90 border border-[#2D3540]/70">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAA228]/20 text-[#EAA228] font-black text-xs">
            {staff.email ? staff.email.slice(0, 2).toUpperCase() : staff.restaurantName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">
              {staff.email || roleLabelMap[staff.role] || staff.role}
            </p>
            <p className="truncate text-[10px] text-[#8C95A3] font-medium">
              {roleLabelMap[staff.role] || staff.role}
            </p>
          </div>
        </div>

        <LogoutButton />

        <p className="text-[10px] text-center text-[#6B7584]">
          Paktak Tech SaaS · v1.2
        </p>
      </div>
    </aside>
  );
}
