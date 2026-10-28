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

  const occupancyRate =
    data.operationalStatus.totalTables > 0
      ? Math.round((data.operationalStatus.occupiedTables / data.operationalStatus.totalTables) * 100)
      : 0;

  return (
    <div className="space-y-6 font-sans text-[#181C20]">
      {/* 1. Selector de Período y Métrica Total Permanente */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-2xl border border-[#EAE5DE] shadow-xs">
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
                      ? 'bg-[#EAA228] text-[#181C20] shadow-xs font-black'
                      : 'text-[#666E7A] hover:bg-[#FAF7F2] hover:text-[#181C20]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#666E7A] px-2 shrink-0">
            <span className="flex h-2 w-2 rounded-full bg-[#EAA228] animate-pulse" />
            <span>Total Histórico:</span>
            <span className="font-mono font-black text-[#181C20] text-sm">
              {formatMoney(data.allTimeSalesCents)}
            </span>
            <span className="text-[11px] text-[#8C95A3]">
              ({data.allTimeOrdersCount} órdenes seguras)
            </span>
          </div>
        </div>

        {/* Alerta informativa amigable cuando 'Hoy' aún tiene $0 */}
        {data.selectedPeriod === 'hoy' && data.todaySalesCents === 0 && (
          <div className="rounded-2xl border border-[#F6E3B8] bg-[#FEF9EE] p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#EAA228] text-[#181C20] flex items-center justify-center font-black shrink-0 shadow-xs">
                <Clock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#7A642B]">
                  Nuevo Día Operativo en Curso
                </h4>
                <p className="text-xs text-[#5A6370] mt-0.5">
                  Hoy aún no se han registrado comandas. <strong>Toda tu información está guardada de forma 100% segura en la base de datos</strong> (tienes <strong>{formatMoney(data.allTimeSalesCents)}</strong> en {data.allTimeOrdersCount} pedidos históricos).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/admin?period=ayer"
                className="h-9 px-4 rounded-full bg-white border border-[#D9D3C7] text-xs font-bold text-[#181C20] hover:bg-[#FAF7F2] shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <span>Ver Ventas de Ayer</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#EAA228]" />
              </Link>
              <Link
                href="/admin?period=semana"
                className="h-9 px-4 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] text-xs font-black shadow-xs flex items-center gap-1.5 transition-colors"
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
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#FEF9EE] text-[#EAA228] flex items-center justify-center font-bold">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#181C20]">Salón & Mesas</h4>
                <p className="text-[11px] text-[#666E7A]">Capacidad en sala</p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-[#181C20]">
              {data.operationalStatus.occupiedTables}/{data.operationalStatus.totalTables} ocupadas
            </span>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#666E7A] font-medium">
              <span>{occupancyRate}% ocupación</span>
              <span>{data.operationalStatus.freeTables} mesas libres</span>
            </div>
            <div className="h-2 w-full bg-[#FAF7F2] rounded-full overflow-hidden border border-[#EAE5DE]">
              <div
                className="h-full bg-[#EAA228] rounded-full transition-all"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>

          <Link
            href="/admin/mesas"
            className="mt-4 pt-3 border-t border-[#EAE5DE] flex items-center justify-between text-xs font-extrabold text-[#EAA228] hover:underline"
          >
            <span>Gestionar Salón</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Cocina KDS */}
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#FEF9EE] text-[#EAA228] flex items-center justify-center font-bold">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#181C20]">Cocina KDS</h4>
                <p className="text-[11px] text-[#666E7A]">Platos en turno</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF7EE] text-[#1E7E34] border border-[#28A745]/30 px-2.5 py-0.5 text-[10px] font-black">
              <span className="h-1.5 w-1.5 rounded-full bg-[#28A745] animate-pulse" />
              KDS Activo
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs">
            <div className="flex-1 rounded-xl bg-[#FAF7F2] p-2.5 text-center border border-[#EAE5DE]">
              <p className="font-mono text-base font-black text-[#181C20]">
                {data.operationalStatus.kitchenPreparingCount}
              </p>
              <p className="text-[10px] text-[#666E7A] font-medium">En preparación</p>
            </div>
            <div className="flex-1 rounded-xl bg-[#FEF9EE] border border-[#F6E3B8] p-2.5 text-center">
              <p className="font-mono text-base font-black text-[#EAA228]">
                {data.operationalStatus.kitchenReadyCount}
              </p>
              <p className="text-[10px] text-[#7A642B] font-bold">Listos para servir</p>
            </div>
          </div>

          <Link
            href="/admin/cocina"
            className="mt-4 pt-3 border-t border-[#EAE5DE] flex items-center justify-between text-xs font-extrabold text-[#EAA228] hover:underline"
          >
            <span>Monitorear KDS Cocina</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Retiro & WhatsApp */}
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#FEF9EE] text-[#EAA228] flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#181C20]">Takeout & Retiros</h4>
                <p className="text-[11px] text-[#666E7A]">Clientes para retirar</p>
              </div>
            </div>
            <span className="font-mono text-sm font-black text-[#EAA228]">
              {data.pendingPickupCount} pendientes
            </span>
          </div>

          <p className="mt-4 text-xs text-[#666E7A]">
            {data.pendingPickupCount > 0
              ? 'Hay pedidos listos esperando ser cobrados y entregados a los clientes.'
              : 'Todos los pedidos para llevar han sido retirados y cobrados exitosamente.'}
          </p>

          <Link
            href="/admin/mesas?view=pedidos"
            className="mt-4 pt-3 border-t border-[#EAE5DE] flex items-center justify-between text-xs font-extrabold text-[#EAA228] hover:underline"
          >
            <span>Ver Bandeja de Pedidos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 3. Tarjetas KPI Financieras del Período */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ventas */}
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8C95A3]">
            {data.periodLabel}
          </span>
          <p className="mt-2 text-3xl font-black text-[#181C20]">
            {formatMoney(data.todaySalesCents)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#666E7A] font-medium">
            <ShoppingBag className="w-3.5 h-3.5 text-[#EAA228]" />
            <span>{data.totalOrders} órdenes pagadas</span>
          </div>
        </div>

        {/* Costo & Margen */}
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8C95A3]">Margen Neto Operativo</span>
          <p className="mt-2 text-3xl font-black text-[#181C20]">
            {formatMoney(data.netMarginCents)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#EAA228] font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Insumos est. (35%): {formatMoney(data.operatingCostCents)}</span>
          </div>
        </div>

        {/* Arqueo por Método de Pago */}
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8C95A3]">Caja por Método de Pago</span>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#666E7A] font-medium">
                <Banknote className="w-3.5 h-3.5 text-[#EAA228]" />
                <span>Efectivo:</span>
              </span>
              <span className="font-mono font-bold text-[#181C20]">
                {formatMoney(data.paymentMethods.efectivo.totalCents)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#666E7A] font-medium">
                <Smartphone className="w-3.5 h-3.5 text-[#EAA228]" />
                <span>Transferencia:</span>
              </span>
              <span className="font-mono font-bold text-[#181C20]">
                {formatMoney(data.paymentMethods.transferencia.totalCents)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#666E7A] font-medium">
                <CreditCard className="w-3.5 h-3.5 text-[#EAA228]" />
                <span>Tarjeta:</span>
              </span>
              <span className="font-mono font-bold text-[#181C20]">
                {formatMoney(data.paymentMethods.tarjeta.totalCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8C95A3]">Ticket Promedio</span>
          <p className="mt-2 text-3xl font-black text-[#EAA228]">
            {formatMoney(data.avgTicketCents)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#666E7A]">
            <span>Consumo promedio comanda</span>
            <Link
              href="/admin/reportes"
              className="font-bold text-[#EAA228] hover:underline flex items-center gap-0.5"
            >
              <span>Reportes</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Platos Estrella Más Vendidos */}
      <section className="rounded-2xl border border-[#EAE5DE] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#FEF9EE] text-[#EAA228] flex items-center justify-center font-bold">
              <Award className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#181C20]">
                Platos Estrella Más Vendidos
              </h3>
              <p className="text-xs text-[#666E7A]">Los platillos favoritos y con mayor recaudación</p>
            </div>
          </div>

          <Link
            href="/admin/menu"
            className="text-xs font-bold text-[#EAA228] hover:underline flex items-center gap-1"
          >
            <span>Ver Carta Completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data.topDishes.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#8C95A3]">
            Aún no hay platos registrados en este período.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {data.topDishes.map((dish, idx) => (
              <div
                key={dish.name}
                className="group relative rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-3 flex flex-col justify-between hover:border-[#EAA228] transition-all shadow-xs"
              >
                <div>
                  <div className="relative h-28 w-full rounded-xl overflow-hidden mb-2.5 bg-white border border-[#EAE5DE]">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#181C20]/80 text-white text-[11px] font-black backdrop-blur-xs">
                      #{idx + 1}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#181C20] line-clamp-1">
                    {dish.name}
                  </h4>
                  <p className="text-[11px] text-[#666E7A] font-medium mt-0.5">
                    {dish.quantity} órdenes vendidas
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#EAE5DE] flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#8C95A3]">Recaudado</span>
                  <span className="font-mono font-black text-[#181C20]">
                    {formatMoney(dish.totalCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Cruzamiento de Datos: Canales vs Creador */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Canales */}
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#181C20]">Ventas por Canal</h3>
              <p className="text-xs text-[#666E7A]">Menú Digital WhatsApp vs Salón vs Takeout</p>
            </div>
            <Store className="w-4 h-4 text-[#8C95A3]" />
          </div>

          {data.channels.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#8C95A3]">Aún no hay pedidos registrados hoy.</p>
          ) : (
            <div className="space-y-3">
              {data.channels.map((ch) => (
                <div key={ch.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#181C20]">{ch.name}</span>
                    <span className="font-black text-[#181C20]">
                      {formatMoney(ch.totalCents)}{' '}
                      <span className="text-[11px] font-normal text-[#666E7A]">
                        ({ch.count} pedidos · {ch.percentage}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#FAF7F2] border border-[#EAE5DE]">
                    <div
                      className="h-full rounded-full bg-[#EAA228]"
                      style={{ width: `${Math.min(100, Math.max(4, ch.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Atendido Por */}
        <div className="rounded-2xl border border-[#EAE5DE] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#181C20]">Atendido / Creado Por</h3>
              <p className="text-xs text-[#666E7A]">Desempeño de meseros y autogestión de clientes</p>
            </div>
            <Users className="w-4 h-4 text-[#8C95A3]" />
          </div>

          {data.creators.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#8C95A3]">Aún no hay comisiones ni órdenes hoy.</p>
          ) : (
            <div className="space-y-3">
              {data.creators.map((cr) => (
                <div key={cr.name} className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE5DE] text-xs">
                  <div>
                    <p className="font-bold text-[#181C20]">{cr.name}</p>
                    <p className="text-[11px] text-[#666E7A] font-medium">{cr.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#181C20]">{formatMoney(cr.totalCents)}</p>
                    <p className="text-[11px] text-[#666E7A]">{cr.count} órdenes</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. Herramienta de Captación: Auto-Respuesta WhatsApp */}
      <section className="rounded-2xl border border-[#EAE5DE] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF9EE] text-[#EAA228] border border-[#F6E3B8] shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#181C20]">
                  Enlace y Auto-Respuesta para WhatsApp
                </h3>
                <span className="rounded-full bg-[#EBF7EE] text-[#1E7E34] px-2 py-0.5 text-[10px] font-bold">
                  Captación de Clientes
                </span>
              </div>
              <p className="text-xs text-[#666E7A] mt-0.5">
                Comparte tu menú digital directo o configúralo como mensaje de bienvenida en WhatsApp Business.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void copyToClipboard(menuUrl, 'link')}
              className="h-9 rounded-full border border-[#D9D3C7] bg-[#FAF7F2] px-4 text-xs font-semibold text-[#181C20] hover:bg-[#F3EFE8] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#EAA228]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Enlace Copiado' : 'Copiar Enlace'}</span>
            </button>

            <button
              type="button"
              onClick={() => void copyToClipboard(whatsappTemplate, 'msg')}
              className="h-9 rounded-full bg-[#EAA228] hover:bg-[#D99318] px-4.5 text-xs font-black text-[#181C20] shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? 'Mensaje Copiado' : 'Copiar Mensaje WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* Vista previa limpia */}
        <div className="rounded-2xl border border-[#F6E3B8] bg-[#FEF9EE] p-4 text-xs text-[#555E6B]">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAA228] text-[#181C20] font-bold">
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-medium text-[#181C20]">
                ¡Hola! Gracias por comunicarte con <strong className="font-bold">{staff.restaurantName}</strong>. Puedes revisar nuestra carta y pedir directamente aquí:
              </p>
              <p className="font-mono text-[#D99318] font-bold break-all">
                {menuUrl}
              </p>
              <p className="text-[11px] text-[#7A642B]">
                No necesitas pagar por adelantado; prepararemos tu pedido y podrás pagar al momento de retirarlo en el local.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
