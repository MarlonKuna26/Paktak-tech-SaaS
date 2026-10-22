'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  ShieldCheck,
  RotateCcw,
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

  return (
    <div className="space-y-6 font-sans">
      {/* Selector de Período y Estado de Información */}
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
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
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
          <div className="rounded-2xl border border-amber-300/70 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-950/20 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#f3a806] text-zinc-950 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Clock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
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
                className="h-8.5 px-3.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <span>Ver Ventas de Ayer</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#f3a806]" />
              </Link>
              <Link
                href="/admin?period=semana"
                className="h-8.5 px-3.5 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 text-xs font-black shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Últimos 7 Días</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 1. Tarjetas KPI de Resumen Ejecutivo y Costos de Operación */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {data.periodLabel}
          </span>
          <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
            {formatMoney(data.todaySalesCents)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
            <ShoppingBag className="w-3.5 h-3.5 text-[#f3a806]" />
            <span>{data.totalOrders} órdenes procesadas</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Costos de Insumos (35%)</span>
          <p className="mt-2 text-3xl font-black text-zinc-500 dark:text-zinc-400">
            {formatMoney(data.operatingCostCents)}
          </p>
          <p className="mt-2 text-[11px] text-zinc-400 font-medium">
            Costo estimado de materia prima
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Margen Neto Operativo</span>
          <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {formatMoney(data.netMarginCents)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Rentabilidad operativa positiva</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Por Cobrar al Retirar</span>
          <p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">
            {data.pendingPickupCount}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Ticket prom: {formatMoney(data.avgTicketCents)}</span>
            <Link
              href="/admin/mesas?view=pedidos"
              className="font-bold text-[#f3a806] hover:underline flex items-center gap-0.5"
            >
              <span>Ver</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Monitor de Estado de Cocina & Cocinero */}
      <section className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-[#f3a806] border border-amber-500/20 shadow-2xs">
            <ChefHat className="h-5 w-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Cocina & Cocinero en Turno
              </span>
              <span className="rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                Activa / En Turno
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Supervisión en vivo de órdenes, cocineros asignados, semáforos de fuego y despacho.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/cocina"
            className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-4 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <ChefHat className="w-3.5 h-3.5 text-[#f3a806]" />
            <span>Monitorear KDS Cocina</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 3. Cruzamiento de Datos: Canales vs Creador del Pedido */}
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

      {/* 4. Lista Rápida de Pedidos Recientes & Acceso a Módulos */}
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
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
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

      {/* 5. Herramienta de Captación: Auto-Respuesta WhatsApp & Enlace de Menú (Al final del Resumen) */}
      <section className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 border border-emerald-500/20 shadow-2xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Enlace y Auto-Respuesta para WhatsApp
                </h3>
                <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
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
              className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Enlace Copiado' : 'Copiar Enlace'}</span>
            </button>

            <button
              type="button"
              onClick={() => void copyToClipboard(whatsappTemplate, 'msg')}
              className="h-9 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-4 text-xs font-bold text-zinc-950 shadow-xs transition-colors flex items-center gap-1.5"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? 'Mensaje Copiado' : 'Copiar Mensaje para WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* Vista previa limpia y elegante estilo mensaje WhatsApp */}
        <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-r from-emerald-50/40 via-zinc-50/50 to-white dark:from-emerald-950/20 dark:via-zinc-900 dark:to-zinc-900 p-4 text-xs text-zinc-700 dark:text-zinc-300">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs">
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                ¡Hola! Gracias por comunicarte con <strong className="font-bold text-zinc-900 dark:text-zinc-100">{staff.restaurantName}</strong>. Puedes revisar nuestra carta y pedir directamente aquí:
              </p>
              <p className="font-mono text-emerald-700 dark:text-emerald-400 font-bold break-all">
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
