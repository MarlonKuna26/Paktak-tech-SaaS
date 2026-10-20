'use client';

import { useCallback, useEffect, useState } from 'react';

type PaymentMethodStat = {
  method: 'efectivo' | 'transferencia' | 'tarjeta';
  count: number;
  total_cents: number;
};

type TopProductStat = {
  product_name: string;
  quantity: number;
  total_cents: number;
};

type HourlyStat = {
  hour: number;
  orders_count: number;
  sales_cents: number;
};

type DailyReportData = {
  date: string;
  total_sales_cents: number;
  total_orders: number;
  avg_ticket_cents: number;
  payment_methods: PaymentMethodStat[];
  top_products: TopProductStat[];
  by_hour: HourlyStat[];
};

export function DailyReportView({ restaurantName }: { restaurantName: string }) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/daily?date=${selectedDate}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || 'No se pudo cargar el reporte diario.');
      }
      const data = (await res.json()) as { report: DailyReportData };
      setReport(data.report);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cargar reporte';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError('');
        try {
          const res = await fetch(`/api/reports/daily?date=${selectedDate}`);
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
            const message = err instanceof Error ? err.message : 'Error inesperado al cargar reporte';
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
  }, [selectedDate]);

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
      ['Reporte Diario de Ventas - Paktak Tech'],
      ['Restaurante', restaurantName],
      ['Fecha', report.date],
      [''],
      ['Resumen General'],
      ['Total Ventas', (report.total_sales_cents / 100).toFixed(2)],
      ['Total Ordenes', report.total_orders.toString()],
      ['Ticket Promedio', (report.avg_ticket_cents / 100).toFixed(2)],
      [''],
      ['Metodos de Pago', 'Transacciones', 'Monto ($)'],
      ...report.payment_methods.map((m) => [m.method, m.count.toString(), (m.total_cents / 100).toFixed(2)]),
      [''],
      ['Top Productos', 'Cantidad', 'Monto ($)'],
      ...report.top_products.map((p) => [p.product_name, p.quantity.toString(), (p.total_cents / 100).toFixed(2)]),
      [''],
      ['Hora', 'Ordenes', 'Venta ($)'],
      ...report.by_hour.map((h) => [`${h.hour}:00`, h.orders_count.toString(), (h.sales_cents / 100).toFixed(2)]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_ventas_${report.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cálculos para arqueo de caja
  const cashTotalCents = report?.payment_methods.find((m) => m.method === 'efectivo')?.total_cents || 0;
  const digitalTotalCents = (report?.total_sales_cents || 0) - cashTotalCents;

  // Máximo para escala del gráfico horario
  const maxHourSales = Math.max(...(report?.by_hour.map((h) => h.sales_cents) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* Barra de Controles y Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <label htmlFor="report-date-picker" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fecha de Cierre:
          </label>
          <input
            id="report-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="h-9 rounded-lg border bg-muted/40 px-3 text-xs font-medium hover:bg-muted transition-colors"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshReport()}
            className="h-9 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors"
            title="Refrescar datos"
          >
            🔄 Actualizar
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!report || report.total_orders === 0}
            className="h-9 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40"
          >
            📥 Exportar CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!report}
            className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            🖨️ Imprimir Cierre
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
          <p className="text-sm text-muted-foreground animate-pulse">Cargando reporte de ventas...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Encabezado visible al imprimir */}
          <div className="hidden print:block border-b pb-4 mb-4">
            <h1 className="text-xl font-bold">Cierre de Caja y Reporte Diario</h1>
            <p className="text-sm text-muted-foreground">{restaurantName}</p>
            <p className="text-xs text-muted-foreground">Fecha: {report.date}</p>
          </div>

          {/* Tarjetas KPI Principales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Venta Total</span>
              <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(report.total_sales_cents)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Ingresos netos cobrados</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Órdenes Pagadas</span>
              <p className="mt-2 text-2xl font-bold">{report.total_orders}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Mesas y cuentas cerradas</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ticket Promedio</span>
              <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
                {formatMoney(report.avg_ticket_cents)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Consumo medio por orden</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Efectivo en Caja</span>
              <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatMoney(cashTotalCents)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Digital: {formatMoney(digitalTotalCents)}
              </p>
            </div>
          </div>

          {/* Métodos de Pago y Cuadre de Caja */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Métodos de pago */}
            <div className="rounded-xl border bg-card p-5 shadow-xs">
              <h2 className="text-sm font-semibold mb-4">💳 Desglose por Método de Pago</h2>
              {report.payment_methods.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No hay cobros registrados en esta fecha.</p>
              ) : (
                <div className="space-y-4">
                  {report.payment_methods.map((method) => {
                    const percent =
                      report.total_sales_cents > 0
                        ? Math.round((method.total_cents / report.total_sales_cents) * 100)
                        : 0;

                    const label =
                      method.method === 'efectivo'
                        ? '💵 Efectivo'
                        : method.method === 'transferencia'
                        ? '📲 Transferencia'
                        : '💳 Tarjeta de Débito/Crédito';

                    return (
                      <div key={method.method} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{label}</span>
                          <span className="font-mono font-semibold">
                            {formatMoney(method.total_cents)}{' '}
                            <span className="text-muted-foreground font-normal">
                              ({method.count} ops · {percent}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              method.method === 'efectivo'
                                ? 'bg-amber-500'
                                : method.method === 'transferencia'
                                ? 'bg-sky-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Arqueo y Cuadre Rápido */}
                  <div className="mt-6 rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
                    <p className="font-semibold text-foreground">Resumen de Cuadre de Caja (Turno)</p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Efectivo Físico Esperado:</span>
                      <strong className="text-foreground">{formatMoney(cashTotalCents)}</strong>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Bancos / Pagos Digitales:</span>
                      <strong className="text-foreground">{formatMoney(digitalTotalCents)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top 5 Productos Más Vendidos */}
            <div className="rounded-xl border bg-card p-5 shadow-xs">
              <h2 className="text-sm font-semibold mb-4">🏆 Top Productos Más Vendidos</h2>
              {report.top_products.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No hay productos vendidos en esta fecha.</p>
              ) : (
                <div className="space-y-3">
                  {report.top_products.map((prod, idx) => (
                    <div
                      key={prod.product_name}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-foreground">{prod.product_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-foreground">{formatMoney(prod.total_cents)}</p>
                        <p className="text-[11px] text-muted-foreground">{prod.quantity} unidades</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gráfico Horario de Actividad y Ventas */}
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold mb-1">⏱️ Ritmo de Ventas por Hora</h2>
            <p className="text-xs text-muted-foreground mb-4">Picos de demanda a lo largo del día de operación</p>

            {report.by_hour.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No hay actividad por hora registrada.</p>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1.5 items-end h-40 pt-6">
                {Array.from({ length: 24 }).map((_, hourIndex) => {
                  const stat = report.by_hour.find((h) => h.hour === hourIndex);
                  const sales = stat?.sales_cents || 0;
                  const orders = stat?.orders_count || 0;
                  const heightPercent = sales > 0 ? Math.max(10, Math.round((sales / maxHourSales) * 100)) : 0;

                  return (
                    <div key={hourIndex} className="flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip hover */}
                      {sales > 0 && (
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center rounded-md bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md pointer-events-none whitespace-nowrap border">
                          <span>{hourIndex}:00 hrs</span>
                          <strong>{formatMoney(sales)}</strong>
                          <span>{orders} órden(es)</span>
                        </div>
                      )}

                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          sales > 0 ? 'bg-primary hover:bg-primary/80' : 'bg-muted/30'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="mt-1 text-[9px] text-muted-foreground font-mono">
                        {hourIndex}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
