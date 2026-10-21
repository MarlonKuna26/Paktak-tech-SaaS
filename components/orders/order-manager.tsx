'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { RefreshCw, ClipboardList, Check, ArrowRight, Printer, CreditCard, DollarSign, Wallet, Search, Receipt } from 'lucide-react';
import { ThermalReceiptModal } from './thermal-receipt-modal';
import { TableCheckoutModal, type TableOrderDetails } from '@/components/tables/table-checkout-modal';

type PublicOrder = {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  total_cents: number;
  status: 'pendiente' | 'confirmado' | 'rechazado' | 'preparando' | 'listo' | 'completado' | 'cancelado';
  service_type?: 'paleta_madera' | 'mesa_fija' | 'para_llevar';
  table_or_token_number?: string | null;
  payment_status?: 'pendiente' | 'pagado';
  payment_method?: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro' | null;
  paid_amount_cents?: number | null;
  change_cents?: number | null;
  rejection_reason: string | null;
  created_at: string;
  public_order_items: Array<{
    product_name: string;
    quantity: number;
    unit_price_cents: number;
    notes: string | null;
  }>;
};

// Badges discretos y elegantes con fondos sutiles (10%) y tipografía nítida
const statusBadges: Record<PublicOrder['status'], { label: string; className: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  },
  confirmado: {
    label: 'Confirmado',
    className: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  },
  preparando: {
    label: 'En Cocina',
    className: 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  },
  listo: {
    label: 'Listo para Entrega',
    className: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  completado: {
    label: 'Completado',
    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
  rechazado: {
    label: 'Rechazado',
    className: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
};

export function OrderManager({ restaurantId }: { restaurantId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'activos' | 'mesas' | 'pendientes' | 'cobrados' | 'todos'>('activos');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal de Cobro & Paleta (para pedidos de mostrador / delivery)
  const [payingOrder, setPayingOrder] = useState<PublicOrder | null>(null);
  const [payServiceType, setPayServiceType] = useState<'paleta_madera' | 'mesa_fija' | 'para_llevar'>('paleta_madera');
  const [tokenInput, setTokenInput] = useState('');
  const [payMethod, setPayMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo');
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<PublicOrder | null>(null);

  // Modal de Cobro de Mesa de Salón (con propina, división y liberación de mesa)
  const [checkoutTableOrder, setCheckoutTableOrder] = useState<TableOrderDetails | null>(null);

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    const [{ data: publicData, error: queryError }, { data: tableOrdersData }] = await Promise.all([
      supabase
        .from('public_order_requests')
        .select('id,tracking_code,customer_name,customer_phone,notes,total_cents,status,service_type,table_or_token_number,payment_status,payment_method,paid_amount_cents,change_cents,rejection_reason,created_at,public_order_items(product_name,quantity,unit_price_cents,notes)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_cents,
          status,
          opened_at,
          tables(table_number,zone),
          order_items(id,product_name,quantity,unit_price_cents,notes,status),
          payments(method,amount_cents)
        `)
        .eq('restaurant_id', restaurantId)
        .order('opened_at', { ascending: false }),
    ]);

    if (!isSilent) setIsRefreshing(false);

    if (queryError) {
      setError('No se pudieron cargar los pedidos en tiempo real.');
    } else {
      type PaymentRow = { method: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro'; amount_cents: number };
      type OrderItemRow = { product_name: string; quantity: number; unit_price_cents: number; notes: string | null; status: string };
      type TableOrderRow = {
        id: string;
        order_number: number;
        total_cents: number;
        status: string;
        opened_at: string;
        tables: { table_number: number; zone: string | null } | null;
        order_items: OrderItemRow[];
        payments: PaymentRow[];
      };

      const formattedTableOrders: PublicOrder[] = ((tableOrdersData ?? []) as unknown as TableOrderRow[]).map((tOrder) => {
        const tableNum = tOrder.tables?.table_number || '?';
        const hasPendingItems = tOrder.order_items?.some((it) => it.status === 'pendiente');
        const hasPreparingItems = tOrder.order_items?.some((it) => it.status === 'preparando');
        const orderStatus: PublicOrder['status'] = tOrder.status === 'pagada'
          ? 'completado'
          : tOrder.status === 'cancelada'
            ? 'cancelado'
            : hasPendingItems
              ? 'confirmado'
              : hasPreparingItems
                ? 'preparando'
                : 'listo';

        const paymentMethod = (tOrder.payments && tOrder.payments.length > 0)
          ? tOrder.payments[0].method
          : (tOrder.status === 'pagada' ? 'efectivo' : null);

        return {
          id: tOrder.id,
          tracking_code: `MESA-${tableNum}`,
          customer_name: `Mesa #${tableNum} (Salón)`,
          customer_phone: tOrder.tables?.zone || 'Comanda Interna',
          notes: null,
          total_cents: tOrder.total_cents,
          status: orderStatus,
          service_type: 'mesa_fija',
          table_or_token_number: String(tableNum),
          payment_status: tOrder.status === 'pagada' ? 'pagado' : 'pendiente',
          payment_method: paymentMethod,
          paid_amount_cents: tOrder.total_cents,
          change_cents: 0,
          rejection_reason: null,
          created_at: tOrder.opened_at,
          public_order_items: (tOrder.order_items ?? []).map((it) => ({
            product_name: it.product_name,
            quantity: it.quantity,
            unit_price_cents: it.unit_price_cents,
            notes: it.notes,
          })),
        };
      });

      const merged = [...((publicData as PublicOrder[]) ?? []), ...formattedTableOrders];
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(merged);
    }
  }, [restaurantId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    const channel = supabase
      .channel(`order-manager-realtime-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'public_order_requests', filter: `restaurant_id=eq.${restaurantId}` },
        () => void load(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => void load(true)
      )
      .subscribe();

    const interval = setInterval(() => void load(true), 10000);

    return () => {
      window.clearTimeout(timer);
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [load, restaurantId, supabase]);

  async function transition(orderId: string, nextStatus: PublicOrder['status'], extraData?: Record<string, unknown>) {
    setError('');
    const target = orders.find((o) => o.id === orderId);

    if (target?.service_type === 'mesa_fija') {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus === 'completado' ? 'pagada' : nextStatus }),
        });
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          setError(body.error ?? 'Error al actualizar comanda.');
          return;
        }
        await load(true);
        return;
      } catch {
        setError('Error al actualizar comanda.');
        return;
      }
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, ...extraData }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? 'No se pudo actualizar el estado.');
        return;
      }
      await load(true);
    } catch {
      setError('Error al conectar con el servidor.');
    }
  }

  function openPaymentModal(order: PublicOrder) {
    setPayingOrder(order);
    setPayServiceType(order.service_type || 'paleta_madera');
    setTokenInput(order.table_or_token_number || '');
    setPayMethod('efectivo');
    setCashAmountInput((order.total_cents / 100).toFixed(2));
  }

  async function handleConfirmPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payingOrder) return;
    setError('');
    setIsProcessingPayment(true);

    const cashGivenDollars = parseFloat(cashAmountInput.replace(',', '.'));
    const paidAmountCents = payMethod === 'efectivo' && !isNaN(cashGivenDollars)
      ? Math.round(cashGivenDollars * 100)
      : payingOrder.total_cents;

    try {
      const response = await fetch(`/api/orders/${payingOrder.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: payServiceType,
          tableOrTokenNumber: tokenInput.trim() || undefined,
          paymentMethod: payMethod,
          paidAmountCents,
        }),
      });

      const body = (await response.json()) as { error?: string; order?: PublicOrder };
      setIsProcessingPayment(false);

      if (!response.ok) {
        setError(body.error || 'No se pudo registrar el pago.');
        return;
      }

      const updated = {
        ...payingOrder,
        payment_status: 'pagado' as const,
        payment_method: payMethod,
        paid_amount_cents: paidAmountCents,
        service_type: payServiceType,
        table_or_token_number: tokenInput.trim(),
        change_cents: Math.max(0, paidAmountCents - payingOrder.total_cents),
      };

      setPayingOrder(null);
      await load(true);
      setPrintingOrder(updated);
    } catch {
      setIsProcessingPayment(false);
      setError('Error al procesar el pago.');
    }
  }

  async function handleRejectOrder() {
    if (!rejectingOrderId) return;
    await transition(rejectingOrderId, 'rechazado', { rejectionReason: rejectReason || 'Sin motivo especificado' });
    setRejectingOrderId(null);
    setRejectReason('');
  }

  const paidOrders = useMemo(() => orders.filter((o) => o.payment_status === 'pagado'), [orders]);
  const paidTotalCents = useMemo(() => paidOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0), [paidOrders]);
  const cashTotalCents = useMemo(
    () => paidOrders.filter((o) => o.payment_method === 'efectivo').reduce((sum, o) => sum + (o.total_cents || 0), 0),
    [paidOrders]
  );
  const digitalTotalCents = paidTotalCents - cashTotalCents;
  const cashCount = paidOrders.filter((o) => o.payment_method === 'efectivo').length;
  const digitalCount = paidOrders.length - cashCount;

  const filteredOrders = useMemo(() => {
    let result = orders;
    switch (filter) {
      case 'activos':
        result = orders.filter((o) => ['pendiente', 'confirmado', 'preparando', 'listo'].includes(o.status) && o.payment_status !== 'pagado');
        break;
      case 'pendientes':
        result = orders.filter((o) => o.status === 'pendiente');
        break;
      case 'mesas':
        result = orders.filter((o) => o.service_type === 'mesa_fija');
        break;
      case 'cobrados':
        result = orders.filter((o) => o.payment_status === 'pagado');
        break;
      case 'todos':
      default:
        result = orders;
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.tracking_code.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          (o.table_or_token_number && o.table_or_token_number.includes(q)) ||
          o.customer_phone.toLowerCase().includes(q)
      );
    }

    return result;
  }, [filter, orders, searchQuery]);

  const activeCount = orders.filter(
    (o) => ['pendiente', 'confirmado', 'preparando', 'listo'].includes(o.status) && o.payment_status !== 'pagado'
  ).length;
  const pendingCount = orders.filter((o) => o.status === 'pendiente').length;

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Header & Filtros Limpios (Whitespace y Jerarquía) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        {/* Píldoras de Filtro Minimalistas */}
        <div className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800/80 p-1 shadow-2xs overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setFilter('activos')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              filter === 'activos'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Activos ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pendientes')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              filter === 'pendientes'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Por Confirmar ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('mesas')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              filter === 'mesas'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Mesas Salón
          </button>
          <button
            type="button"
            onClick={() => setFilter('cobrados')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              filter === 'cobrados'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Cobrados Hoy ({paidOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('todos')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
              filter === 'todos'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Historial ({orders.length})
          </button>
        </div>

        {/* Buscador & Estado en Vivo y Refrescar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar mesa, código o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#f3a806]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>En vivo</span>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={isRefreshing}
            className="h-8 px-3 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* BANNER DE ARQUEO EN VIVO PARA EL CAJERO AL SELECCIONAR 'COBRADOS HOY' */}
      {filter === 'cobrados' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs animate-in fade-in duration-150">
          <div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Cobrado Hoy</span>
            </div>
            <p className="mt-1.5 text-3xl font-black text-emerald-600 dark:text-emerald-400">
              ${(paidTotalCents / 100).toFixed(2)}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{paidOrders.length} cobros completados</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <DollarSign className="w-3.5 h-3.5 text-[#f3a806]" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Efectivo en Gaveta</span>
            </div>
            <p className="mt-1.5 text-3xl font-black text-zinc-900 dark:text-zinc-100">
              ${(cashTotalCents / 100).toFixed(2)}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{cashCount} cobros en efectivo</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Digital / Tarjeta</span>
            </div>
            <p className="mt-1.5 text-3xl font-black text-zinc-900 dark:text-zinc-100">
              ${(digitalTotalCents / 100).toFixed(2)}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{digitalCount} cobros bancarios</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Receipt className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Ticket Promedio</span>
            </div>
            <p className="mt-1.5 text-3xl font-black text-[#f3a806]">
              ${paidOrders.length > 0 ? (paidTotalCents / (paidOrders.length * 100)).toFixed(2) : '0.00'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Por comanda cobrada</p>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-4 text-xs font-medium text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 2. Lista de Pedidos en Tarjetas Respiradas y Sin Bordes Duros */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-3">
              <ClipboardList className="w-6 h-6 stroke-[1.8]" />
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No hay pedidos en esta sección</p>
            <p className="text-xs text-zinc-500 mt-1">Los nuevos pedidos en vivo aparecerán aquí de forma automática.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const badge = statusBadges[order.status];
            const isPaid = order.payment_status === 'pagado';
            const formattedTotal = (order.total_cents / 100).toFixed(2);
            const timeStr = new Date(order.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

            return (
              <article
                key={order.id}
                className="rounded-2xl bg-white dark:bg-zinc-900 p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Contenido Principal */}
                  <div className="flex-1 space-y-4">
                    {/* Fila Superior: Código, Badges Elegantes y Hora */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        {order.tracking_code}
                      </span>

                      {/* Badge de Estado Sutil */}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>

                      {/* Badge de Pago Sutil */}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {isPaid ? `Pagado (${order.payment_method || 'caja'})` : 'Pago al Retirar'}
                      </span>

                      {/* Badge de Ubicación / Paleta */}
                      {order.table_or_token_number && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-0.5 text-xs font-semibold">
                          {order.service_type === 'paleta_madera' ? `Paleta #${order.table_or_token_number}` : `Mesa #${order.table_or_token_number}`}
                        </span>
                      )}

                      <span className="text-xs text-zinc-400 ml-auto sm:ml-2">
                        {timeStr}
                      </span>
                    </div>

                    {/* Cliente */}
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {order.customer_name}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {order.customer_phone}
                      </p>
                    </div>

                    {/* Desglose de Productos Limpio (Sin cajas toscas) */}
                    <div className="pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Comanda:
                      </p>
                      <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                        {order.public_order_items.map((item, idx) => (
                          <li key={`${order.id}-${idx}`} className="flex items-baseline justify-between">
                            <span className="pr-4">
                              <strong className="font-bold text-zinc-900 dark:text-zinc-100">{item.quantity}×</strong>{' '}
                              <span>{item.product_name}</span>
                              {item.notes && (
                                <span className="text-zinc-400 italic ml-1.5 font-normal">
                                  ({item.notes})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-zinc-500 shrink-0">
                              ${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* Fila de Total Minimalista */}
                      <div className="mt-3 pt-3 flex justify-between items-baseline border-t border-zinc-100 dark:border-zinc-800">
                        <span className="text-xs font-semibold text-zinc-500">Total:</span>
                        <span className="text-base font-black text-zinc-900 dark:text-zinc-100">
                          ${formattedTotal}
                        </span>
                      </div>
                    </div>

                    {/* Nota del Cliente si existe */}
                    {order.notes && (
                      <p className="text-xs text-amber-900 dark:text-amber-300 bg-amber-500/10 p-3 rounded-xl italic">
                        Nota: {order.notes}
                      </p>
                    )}

                    {order.rejection_reason && (
                      <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl">
                        Motivo de rechazo: {order.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* 3. Panel de Acciones con Regla de Color Único (Warm Amber Primario) */}
                  <div className="flex flex-col gap-2.5 sm:min-w-[210px] pt-2 lg:pt-0">
                    {/* Botón Destacado: Cobrar al Retirar / Cobrar Mesa si está pendiente de pago */}
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => {
                          if (order.service_type === 'mesa_fija') {
                            const tableNum = parseInt(order.table_or_token_number || '1', 10);
                            setCheckoutTableOrder({
                              orderId: order.id,
                              orderNumber: tableNum,
                              tableNumber: tableNum,
                              zone: order.customer_phone,
                              subtotalCents: order.total_cents,
                              items: order.public_order_items.map((it, idx) => ({
                                id: `${order.id}-${idx}`,
                                productName: it.product_name,
                                quantity: it.quantity,
                                unitPriceCents: it.unit_price_cents,
                                notes: it.notes,
                              })),
                            });
                          } else {
                            openPaymentModal(order);
                          }
                        }}
                        className="h-11 w-full rounded-full bg-[#f3a806] hover:bg-[#e09804] px-4 text-xs font-bold text-zinc-950 shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>{order.service_type === 'mesa_fija' ? 'Cobrar Mesa (Salón)' : 'Cobrar Pedido'}</span>
                      </button>
                    )}

                    {isPaid && (
                      <button
                        type="button"
                        onClick={() => setPrintingOrder(order)}
                        className="h-11 w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 text-xs font-bold shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Reimprimir Comprobante</span>
                      </button>
                    )}

                    {order.status === 'pendiente' && (
                      <button
                        type="button"
                        onClick={() => void transition(order.id, 'confirmado')}
                        className={`h-11 w-full rounded-full px-4 text-xs font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 ${
                          isPaid
                            ? 'bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 shadow-xs'
                            : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <span>Confirmar a Cocina</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {order.status === 'confirmado' && (
                      <button
                        type="button"
                        onClick={() => void transition(order.id, 'preparando')}
                        className={`h-11 w-full rounded-full px-4 text-xs font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 ${
                          isPaid
                            ? 'bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 shadow-xs'
                            : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <span>Marchar en Cocina</span>
                      </button>
                    )}

                    {order.status === 'preparando' && (
                      <button
                        type="button"
                        onClick={() => void transition(order.id, 'listo')}
                        className="h-11 w-full rounded-full bg-[#f3a806] hover:bg-[#e09804] px-4 text-xs font-bold text-zinc-950 shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Marcar como Listo</span>
                      </button>
                    )}

                    {order.status === 'listo' && (
                      <button
                        type="button"
                        onClick={() => void transition(order.id, 'completado')}
                        className="h-11 w-full rounded-full bg-[#f3a806] hover:bg-[#e09804] px-4 text-xs font-bold text-zinc-950 shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Entregar al Cliente</span>
                      </button>
                    )}

                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => setPrintingOrder(order)}
                        className="h-10 w-full rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-2xs"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Pre-cuenta / Ticket</span>
                      </button>
                    )}

                    {order.status === 'pendiente' && (
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingOrderId(order.id);
                          setRejectReason('');
                        }}
                        className="h-9 w-full rounded-full text-xs font-medium text-zinc-400 hover:text-red-600 transition-colors"
                      >
                        Rechazar Pedido
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal de Cobro & Paleta Limpio y Minimalista */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#f3a806]">Caja & Salón</span>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                Cobrar Pedido #{payingOrder.tracking_code}
              </h2>
              <p className="text-xs text-zinc-500">
                Cliente: {payingOrder.customer_name} · Total: ${(payingOrder.total_cents / 100).toFixed(2)}
              </p>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tipo de Entrega / Identificador
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'paleta_madera', label: 'Paleta' },
                    { type: 'mesa_fija', label: 'Mesa' },
                    { type: 'para_llevar', label: 'Llevar' },
                  ].map((s) => (
                    <button
                      key={s.type}
                      type="button"
                      onClick={() => setPayServiceType(s.type as unknown as typeof payServiceType)}
                      className={`h-9 rounded-xl text-xs font-bold transition-all ${
                        payServiceType === s.type
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {payServiceType !== 'para_llevar' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Número de {payServiceType === 'paleta_madera' ? 'Paleta' : 'Mesa'}
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Ej: 5"
                    required
                    className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { method: 'efectivo', label: 'Efectivo' },
                    { method: 'transferencia', label: 'Transferencia' },
                    { method: 'tarjeta', label: 'Tarjeta' },
                  ].map((m) => (
                    <button
                      key={m.method}
                      type="button"
                      onClick={() => setPayMethod(m.method as unknown as typeof payMethod)}
                      className={`h-9 rounded-xl text-xs font-bold transition-all ${
                        payMethod === m.method
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {payMethod === 'efectivo' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Monto Recibido ($)
                  </label>
                  <input
                    type="text"
                    value={cashAmountInput}
                    onChange={(e) => setCashAmountInput(e.target.value)}
                    className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-xs font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayingOrder(null)}
                  className="h-10 px-5 rounded-full text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="h-10 px-6 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessingPayment ? 'Registrando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Rechazo de Pedido */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Rechazar Pedido
            </h3>
            <p className="text-xs text-zinc-500">
              Ingresa el motivo que verá el cliente (ej. cocina saturada, ingrediente agotado):
            </p>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo"
              className="w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingOrderId(null)}
                className="h-9 px-4 rounded-full text-xs font-medium text-zinc-500 hover:bg-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRejectOrder}
                className="h-9 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Térmico Modal */}
      {printingOrder && (
        <ThermalReceiptModal
          data={{
            orderNumber: printingOrder.tracking_code,
            tableOrToken: printingOrder.table_or_token_number
              ? printingOrder.service_type === 'paleta_madera'
                ? `Paleta #${printingOrder.table_or_token_number}`
                : `Mesa #${printingOrder.table_or_token_number}`
              : 'Mostrador / Llevar',
            dateTime: new Date(printingOrder.created_at).toLocaleString('es-EC'),
            items: printingOrder.public_order_items.map((it) => ({
              name: it.product_name,
              quantity: it.quantity,
              priceCents: it.unit_price_cents,
              notes: it.notes,
            })),
            totalCents: printingOrder.total_cents,
            paymentMethod: printingOrder.payment_method || 'caja',
            paidCents: printingOrder.paid_amount_cents || undefined,
            changeCents: printingOrder.change_cents || undefined,
          }}
          onClose={() => setPrintingOrder(null)}
        />
      )}

      {/* Modal de Cobro de Mesa para el Cajero */}
      {checkoutTableOrder && (
        <TableCheckoutModal
          order={checkoutTableOrder}
          onClose={() => setCheckoutTableOrder(null)}
          onSuccess={() => {
            const tableNum = checkoutTableOrder.tableNumber;
            setCheckoutTableOrder(null);
            void load(true);
          }}
        />
      )}
    </div>
  );
}
