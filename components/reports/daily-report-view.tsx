'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Download,
  Printer,
  TrendingUp,
  Wallet,
  DollarSign,
  Users,
  Store,
  Percent,
} from 'lucide-react';

type ChannelStat = {
  channel: string;
  orders_count: number;
  total_cents: number;
  percentage: number;
};

type CreatorStat = {
  creator: string;
  role: string;
  orders_count: number;
  total_cents: number;
  percentage: number;
};

type PaymentMethodStat = {
  method: string;
  count: number;
  total_cents: number;
};

type DailyReportData = {
  date: string;
  total_sales_cents: number;
  total_orders: number;
  avg_ticket_cents: number;
  operating_cost_cents: number;
  net_margin_cents: number;
  cost_percentage: number;
  by_channel: ChannelStat[];
  by_creator: CreatorStat[];
  payment_methods: PaymentMethodStat[];
};

function getLocalTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DailyReportView({ restaurantName }: { restaurantName: string }) {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayString);
  const [costPercentage, setCostPercentage] = useState<number>(35);
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/daily?date=${selectedDate}&costPercentage=${costPercentage}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || 'No se pudo cargar el reporte diario.');
      }
      const data = (await res.json()) as { report: DailyReportData };
      setReport(data.report);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar reporte';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, costPercentage]);

  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError('');
        try {
          const res = await fetch(`/api/reports/daily?date=${selectedDate}&costPercentage=${costPercentage}`);
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error || 'No se pudo cargar el reporte diario.');
          }
          const data = (await res.json()) as { report: DailyReportData };
          if (!isCancelled) {
            setReport(data.report);
          }
        } catch (err: unknown) {
          if (!isCancelled) {
            const message = err instanceof Error ? err.message : 'Error al cargar reporte';
            setError(message);
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [selectedDate, costPercentage]);

  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;

    const rows = [
      ['Reporte Financiero y Operativo - Paktak Tech'],
      ['Restaurante', restaurantName],
      ['Fecha', report.date],
      [''],
      ['Resumen Financiero'],
      ['Ventas Brutas', (report.total_sales_cents / 100).toFixed(2)],
      ['Costo de Insumos Estimado', (report.operating_cost_cents / 100).toFixed(2)],
      ['Margen Operativo Neto', (report.net_margin_cents / 100).toFixed(2)],
      ['Total Ordenes', report.total_orders.toString()],
      ['Ticket Promedio', (report.avg_ticket_cents / 100).toFixed(2)],
      [''],
      ['Ventas por Canal', 'Ordenes', 'Total ($)'],
      ...report.by_channel.map((c) => [c.channel, c.orders_count.toString(), (c.total_cents / 100).toFixed(2)]),
      [''],
      ['Ventas por Creador / Atendido por', 'Rol', 'Ordenes', 'Total ($)'],
      ...report.by_creator.map((cr) => [cr.creator, cr.role, cr.orders_count.toString(), (cr.total_cents / 100).toFixed(2)]),
      [''],
      ['Metodos de Pago', 'Transacciones', 'Monto ($)'],
      ...report.payment_methods.map((m) => [m.method, m.count.toString(), (m.total_cents / 100).toFixed(2)]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_cierre_${report.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cashTotalCents = report?.payment_methods.find((m) => m.method.toLowerCase().includes('efectivo'))?.total_cents || 0;
  const digitalTotalCents = (report?.total_sales_cents || 0) - cashTotalCents;

  return (
    <div className="space-y-6">
      {/* Controles Superiores: Filtros Limpios y Píldoras */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="report-date-picker" className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Fecha de Cierre:
          </label>
          <input
            id="report-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#f3a806]"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(getLocalTodayString())}
            className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
          >
            Hoy
          </button>

          {/* Ajuste de Costo Operativo Gastronómico */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-100 dark:border-zinc-800">
            <Percent className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500 font-medium">Costo Insumos:</span>
            <input
              type="number"
              min="0"
              max="90"
              value={costPercentage}
              onChange={(e) => setCostPercentage(Number(e.target.value) || 0)}
              className="h-8 w-14 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 text-center text-xs font-bold"
            />
            <span className="text-xs text-zinc-400">%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshReport()}
            className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Refrescar datos"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!report || report.total_orders === 0}
            className="h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!report}
            className="h-10 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-5 text-xs font-bold text-zinc-950 shadow-xs transition-colors flex items-center gap-2 disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cierre</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
          <p className="text-xs font-medium text-zinc-400 animate-pulse">Calculando métricas financieras consolidadas...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Encabezado visible al imprimir */}
          <div className="hidden print:block border-b border-zinc-200 pb-4 mb-4">
            <h1 className="text-xl font-black text-zinc-900">Cierre de Caja & Reporte Financiero</h1>
            <p className="text-xs text-zinc-600">{restaurantName} · Fecha: {report.date}</p>
          </div>

          {/* Tarjetas KPI Financieras */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ventas Totales</span>
              <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
                {formatMoney(report.total_sales_cents)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>{report.total_orders} pedidos cobrados</span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Costos de Operación ({report.cost_percentage}%)</span>
              <p className="mt-2 text-3xl font-black text-zinc-500 dark:text-zinc-400">
                {formatMoney(report.operating_cost_cents)}
              </p>
              <p className="mt-2 text-[11px] text-zinc-400">Costo estimado de materia prima</p>
            </div>

            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Margen Operativo Neto</span>
              <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {formatMoney(report.net_margin_cents)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{100 - report.cost_percentage}% de margen bruto</span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Efectivo en Caja</span>
              <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
                {formatMoney(cashTotalCents)}
              </p>
              <p className="mt-2 text-[11px] text-zinc-500">
                Transferencia/Tarjetas: <span className="font-bold">{formatMoney(digitalTotalCents)}</span>
              </p>
            </div>
          </div>

          {/* Cruzamiento: Canales de Venta vs Quién Realizó el Pedido */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 1. Canales de Venta */}
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Ventas por Canal</h3>
                  <p className="text-xs text-zinc-400">Distribución de ingresos por punto de captación</p>
                </div>
                <Store className="w-4 h-4 text-zinc-400" />
              </div>

              {report.by_channel.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-400">No hay ventas registradas para esta fecha.</p>
              ) : (
                <div className="space-y-3">
                  {report.by_channel.map((ch) => (
                    <div key={ch.channel} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{ch.channel}</span>
                        <span className="font-black text-zinc-900 dark:text-zinc-100">
                          {formatMoney(ch.total_cents)}{' '}
                          <span className="text-[11px] font-normal text-zinc-400">({ch.orders_count} órdenes · {ch.percentage}%)</span>
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

            {/* 2. Quién Realizó / Atendió el Pedido */}
            <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Atendido / Creado Por</h3>
                  <p className="text-xs text-zinc-400">Cruce de ventas por mesero y autogestión de clientes</p>
                </div>
                <Users className="w-4 h-4 text-zinc-400" />
              </div>

              {report.by_creator.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-400">No hay órdenes registradas para esta fecha.</p>
              ) : (
                <div className="space-y-3">
                  {report.by_creator.map((cr) => (
                    <div key={cr.creator} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{cr.creator}</span>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {cr.role}
                          </span>
                        </div>
                        <span className="font-black text-zinc-900 dark:text-zinc-100">
                          {formatMoney(cr.total_cents)}{' '}
                          <span className="text-[11px] font-normal text-zinc-400">({cr.orders_count} órdenes)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200"
                          style={{ width: `${Math.min(100, Math.max(4, cr.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Métodos de Pago y Desglose de Caja */}
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Desglose de Métodos de Cobro</h3>
                <p className="text-xs text-zinc-400">Arqueo y comprobantes para cierre de turno</p>
              </div>
              <Wallet className="w-4 h-4 text-zinc-400" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {report.payment_methods.map((pm) => (
                <div key={pm.method} className="rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/40 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 capitalize">
                    {pm.method}
                  </span>
                  <p className="mt-1.5 text-xl font-black text-zinc-900 dark:text-zinc-100">
                    {formatMoney(pm.total_cents)}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{pm.count} transacciones</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
