'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare,
  Copy,
  Check,
  TrendingUp,
  ShoppingBag,
  Users,
  Store,
  ArrowRight,
  ChefHat,
  Calendar,
  Clock,
  Banknote,
  CreditCard,
  Smartphone,
  Flame,
  Award,
  Sparkles,
  Utensils,
  Layers,
} from 'lucide-react';
import type { CurrentStaff } from '@/lib/auth/get-current-staff';
import type { PeriodType } from '@/lib/utils/date-range';

type DashboardData = {
  selectedPeriod: PeriodType;
  periodLabel: string;
  allTimeSalesCents: number;
  allTimeOrdersCount: number;
  todaySalesCents: number;
  operatingCostCents: number;
  netMarginCents: number;
  totalOrders: number;
  avgTicketCents: number;
  pendingPickupCount: number;
  operationalStatus: {
    totalTables: number;
    occupiedTables: number;
    freeTables: number;
    kitchenPreparingCount: number;
    kitchenReadyCount: number;
  };
  paymentMethods: {
    efectivo: { totalCents: number; count: number };
    tarjeta: { totalCents: number; count: number };
    transferencia: { totalCents: number; count: number };
  };
  topDishes: Array<{
    name: string;
    quantity: number;
    totalCents: number;
    imageUrl: string;
  }>;
  channels: Array<{ name: string; count: number; totalCents: number; percentage: number }>;
  creators: Array<{ name: string; role: string; count: number; totalCents: number }>;
  recentOrders: Array<{
    id: string;
    code: string;
    customer: string;
    totalCents: number;
    channel: string;
    isPaid: boolean;
    status: string;
    time: string;
  }>;
};

export function AdminDashboardOverview({
  staff,
  data,
  hostUrl,
}: {
  staff: CurrentStaff;
  data: DashboardData;
  hostUrl: string;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const menuUrl = `${hostUrl}/${staff.restaurantSlug}/pedir`;
  const whatsappTemplate = `¡Hola! Gracias por comunicarte con ${staff.restaurantName}.\n\nPuedes revisar nuestra carta y realizar tu pedido directamente aquí:\n${menuUrl}\n\nNo necesitas pagar por adelantado; prepararemos tu pedido y podrás pagar al momento de retirarlo en el local.`;

  const copyToClipboard = async (text: string, type: 'link' | 'msg') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
  };

  const occupancyRate = data.operationalStatus.totalTables > 0
    ? Math.round((data.operationalStatus.occupiedTables / data.operationalStatus.totalTables) * 100)
    : 0;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Selector de Período y Métrica Total Permanente */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-zinc-900 p-2 sm:p-2.5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'ayer', label: 'Ayer' },
              { id: 'semana', label: 'Últimos 7 Días' },
              { id: 'mes', label: 'Este Mes' },
              { id: 'todo', label: 'Histórico Total' },
            ].map((p) => {
              const isActive = data.selectedPeriod === p.id;
              return (
                <Link
                  key={p.id}
                  href={p.id === 'hoy' ? '/admin' : `/admin?period=${p.id}`}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#f3a806] text-zinc-950 shadow-xs font-black'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 px-2 shrink-0">
            <span className="flex h-2 w-2 rounded-full bg-[#f3a806] animate-pulse" />
            <span>Total Histórico:</span>
            <span className="font-mono font-black text-zinc-950 dark:text-zinc-100 text-sm">
              {formatMoney(data.allTimeSalesCents)}
            </span>
            <span className="text-[11px] text-zinc-400">
              ({data.allTimeOrdersCount} órdenes seguras)
            </span>
          </div>
        </div>

        {/* Alerta informativa amigable cuando 'Hoy' aún tiene $0 */}
        {data.selectedPeriod === 'hoy' && data.todaySalesCents === 0 && (
          <div className="rounded-3xl border border-amber-300/70 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/20 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#f3a806] text-zinc-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Clock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
                  Nuevo Día Operativo en Curso
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  Hoy aún no se han registrado comandas. <strong>Toda tu información está guardada de forma 100% segura en la base de datos</strong> (tienes <strong>{formatMoney(data.allTimeSalesCents)}</strong> en {data.allTimeOrdersCount} pedidos históricos).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/admin?period=ayer"
                className="h-9 px-4 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <span>Ver Ventas de Ayer</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#f3a806]" />
              </Link>
              <Link
                href="/admin?period=semana"
                className="h-9 px-4 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 text-xs font-black shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Últimos 7 Días</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 2. Torre de Control Operativa en Vivo */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Salón y Mesas */}
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-amber-500/15 text-[#f3a806] flex items-center justify-center font-bold">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Salón & Mesas</h4>
                <p className="text-[11px] text-zinc-400">Capacidad en sala</p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {data.operationalStatus.occupiedTables}/{data.operationalStatus.totalTables} ocupadas
            </span>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
              <span>{occupancyRate}% ocupación</span>
              <span>{data.operationalStatus.freeTables} mesas libres</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f3a806] rounded-full transition-all"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>

          <Link
            href="/admin/mesas"
            className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-[#f3a806] hover:underline"
          >
            <span>Gestionar Salón</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Cocina KDS */}
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-amber-500/15 text-[#f3a806] flex items-center justify-center font-bold">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Cocina KDS</h4>
                <p className="text-[11px] text-zinc-400">Platos en turno</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40 px-2.5 py-0.5 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f3a806] animate-pulse" />
              KDS Activo
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs">
            <div className="flex-1 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-2.5 text-center border border-zinc-100 dark:border-zinc-800">
              <p className="font-mono text-base font-black text-zinc-900 dark:text-zinc-100">
                {data.operationalStatus.kitchenPreparingCount}
              </p>
              <p className="text-[10px] text-zinc-400 font-medium">En preparación</p>
            </div>
            <div className="flex-1 rounded-2xl bg-amber-500/10 border border-[#f3a806]/20 p-2.5 text-center">
              <p className="font-mono text-base font-black text-[#f3a806]">
                {data.operationalStatus.kitchenReadyCount}
              </p>
              <p className="text-[10px] text-amber-900 dark:text-amber-300 font-bold">Listos para servir</p>
            </div>
          </div>

          <Link
            href="/admin/cocina"
            className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-[#f3a806] hover:underline"
          >
            <span>Monitorear KDS Cocina</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Retiro & WhatsApp */}
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-amber-500/15 text-[#f3a806] flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Takeout & Retiros</h4>
                <p className="text-[11px] text-zinc-400">Clientes para retirar</p>
              </div>
            </div>
            <span className="font-mono text-sm font-black text-[#f3a806]">
              {data.pendingPickupCount} pendientes
            </span>
          </div>

          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            {data.pendingPickupCount > 0
              ? 'Hay pedidos listos esperando ser cobrados y entregados a los clientes.'
              : 'Todos los pedidos para llevar han sido retirados y cobrados exitosamente.'}
          </p>

          <Link
            href="/admin/mesas?view=pedidos"
            className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-bold text-[#f3a806] hover:underline"
          >
            <span>Ver Bandeja de Pedidos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 3. Tarjetas KPI Financieras del Período */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ventas */}
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {data.periodLabel}
          </span>
          <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
            {formatMoney(data.todaySalesCents)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
            <ShoppingBag className="w-3.5 h-3.5 text-[#f3a806]" />
            <span>{data.totalOrders} órdenes pagadas</span>
          </div>
        </div>

        {/* Costo & Margen */}
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Margen Neto Operativo</span>
          <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
            {formatMoney(data.netMarginCents)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#d97706] font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#f3a806]" />
            <span>Insumos est. (35%): {formatMoney(data.operatingCostCents)}</span>
          </div>
        </div>

        {/* Arqueo por Método de Pago */}
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Caja por Método de Pago</span>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
                <Banknote className="w-3.5 h-3.5 text-[#f3a806]" />
                <span>Efectivo:</span>
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {formatMoney(data.paymentMethods.efectivo.totalCents)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
                <Smartphone className="w-3.5 h-3.5 text-[#f3a806]" />
                <span>Transferencia:</span>
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {formatMoney(data.paymentMethods.transferencia.totalCents)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
                <CreditCard className="w-3.5 h-3.5 text-[#f3a806]" />
                <span>Tarjeta:</span>
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {formatMoney(data.paymentMethods.tarjeta.totalCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ticket Promedio</span>
          <p className="mt-2 text-3xl font-black text-[#f3a806]">
            {formatMoney(data.avgTicketCents)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Consumo promedio por comanda</span>
            <Link
              href="/admin/reportes"
              className="font-bold text-[#f3a806] hover:underline flex items-center gap-0.5"
            >
              <span>Reportes</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Platos Estrella Más Vendidos (Top Sellers con Fotos) */}
      <section className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-[#f3a806] flex items-center justify-center font-bold">
              <Award className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                Platos Estrella Más Vendidos
              </h3>
              <p className="text-xs text-zinc-400">Los platillos favoritos y con mayor recaudación</p>
            </div>
          </div>

          <Link
            href="/admin/menu"
            className="text-xs font-bold text-[#f3a806] hover:underline flex items-center gap-1"
          >
            <span>Ver Carta Completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data.topDishes.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-400">
            Aún no hay platos registrados en este período.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {data.topDishes.map((dish, idx) => (
              <div
                key={dish.name}
                className="group relative rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 p-3 flex flex-col justify-between hover:border-amber-400/50 transition-all shadow-2xs"
              >
                <div>
                  <div className="relative h-28 w-full rounded-xl overflow-hidden mb-2.5 bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950/80 text-white text-[11px] font-black backdrop-blur-xs">
                      #{idx + 1}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {dish.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                    {dish.quantity} órdenes vendidas
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Recaudado</span>
                  <span className="font-mono font-black text-zinc-950 dark:text-zinc-100">
                    {formatMoney(dish.totalCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Cruzamiento de Datos: Canales vs Creador del Pedido */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cruzamiento por Canal */}
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Ventas por Canal</h3>
              <p className="text-xs text-zinc-400">Menú Digital WhatsApp vs Salón vs Takeout</p>
            </div>
            <Store className="w-4 h-4 text-zinc-400" />
          </div>

          {data.channels.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400">Aún no hay pedidos registrados el día de hoy.</p>
          ) : (
            <div className="space-y-3">
              {data.channels.map((ch) => (
                <div key={ch.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{ch.name}</span>
                    <span className="font-black text-zinc-900 dark:text-zinc-100">
                      {formatMoney(ch.totalCents)}{' '}
                      <span className="text-[11px] font-normal text-zinc-400">
                        ({ch.count} pedidos · {ch.percentage}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-[#f3a806]"
                      style={{ width: `${Math.min(100, Math.max(4, ch.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cruzamiento por Quién Realizó el Pedido */}
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Atendido / Creado Por</h3>
              <p className="text-xs text-zinc-400">Desempeño de meseros y autogestión de clientes</p>
            </div>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>

          {data.creators.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-400">Aún no hay comisiones ni órdenes hoy.</p>
          ) : (
            <div className="space-y-3">
              {data.creators.map((cr) => (
                <div key={cr.name} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/40 text-xs">
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{cr.name}</p>
                    <p className="text-[11px] text-zinc-400 font-medium">{cr.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-zinc-900 dark:text-zinc-100">{formatMoney(cr.totalCents)}</p>
                    <p className="text-[11px] text-zinc-400">{cr.count} órdenes</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. Lista Rápida de Pedidos Recientes */}
      <section className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Órdenes en Vivo del Día</h3>
            <p className="text-xs text-zinc-400">Últimos pedidos recibidos para entrega o cobro</p>
          </div>
          <Link
            href="/admin/mesas?view=pedidos"
            className="text-xs font-bold text-[#f3a806] hover:underline flex items-center gap-1"
          >
            <span>Ir al Panel de Pedidos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data.recentOrders.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
            <p>No hay pedidos recientes hoy.</p>
            <p className="text-[11px] text-zinc-400">
              Comparte el enlace de tu menú en WhatsApp para empezar a recibir órdenes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {data.recentOrders.map((o) => (
              <div key={o.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-black text-zinc-800 dark:text-zinc-200">
                    #{o.code}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{o.customer}</p>
                    <p className="text-[11px] text-zinc-400">
                      {o.time} · {o.channel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      o.isPaid
                        ? 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-[#f3a806]/30'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {o.isPaid ? 'Pagado' : 'Pago al Retirar'}
                  </span>
                  <span className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                    {formatMoney(o.totalCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. Herramienta de Captación: Auto-Respuesta WhatsApp & Enlace de Menú */}
      <section className="rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-[#f3a806] border border-[#f3a806]/30 shadow-2xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Enlace y Auto-Respuesta para WhatsApp
                </h3>
                <span className="rounded-full bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/40 px-2 py-0.5 text-[10px] font-bold">
                  Captación de Clientes
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Comparte tu menú digital directo o configúralo como mensaje de bienvenida en WhatsApp Business.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void copyToClipboard(menuUrl, 'link')}
              className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#f3a806]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Enlace Copiado' : 'Copiar Enlace'}</span>
            </button>

            <button
              type="button"
              onClick={() => void copyToClipboard(whatsappTemplate, 'msg')}
              className="h-9 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-4.5 text-xs font-bold text-zinc-950 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? 'Mensaje Copiado' : 'Copiar Mensaje para WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* Vista previa limpia y elegante estilo mensaje WhatsApp */}
        <div className="rounded-2xl border border-[#f3a806]/20 bg-amber-50/30 dark:bg-amber-950/10 p-4.5 text-xs text-zinc-700 dark:text-zinc-300">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f3a806] text-zinc-950 shadow-2xs font-bold">
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="space-y-1.5 text-xs">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                ¡Hola! Gracias por comunicarte con <strong className="font-bold text-zinc-900 dark:text-zinc-100">{staff.restaurantName}</strong>. Puedes revisar nuestra carta y pedir directamente aquí:
              </p>
              <p className="font-mono text-[#d97706] dark:text-[#f3a806] font-bold break-all">
                {menuUrl}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                No necesitas pagar por adelantado; prepararemos tu pedido y podrás pagar al momento de retirarlo en el local.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
