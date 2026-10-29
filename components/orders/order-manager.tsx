'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  RefreshCw,
  ClipboardList,
  Check,
  ArrowRight,
  Printer,
  CreditCard,
  DollarSign,
  Wallet,
  Search,
  Receipt,
  LayoutGrid,
  Utensils,
  MessageCircle,
  Copy,
  CheckCheck,
  X,
} from 'lucide-react';
import { ThermalReceiptModal } from './thermal-receipt-modal';
import { TableCheckoutModal, type TableOrderDetails } from '@/components/tables/table-checkout-modal';
import { AlertModal } from '@/components/ui/alert-modal';

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
    className: 'bg-[#FEF9EE] text-[#7A642B] border border-[#F6E3B8]',
  },
  confirmado: {
    label: 'Confirmado',
    className: 'bg-[#FAF7F2] text-[#181C20] border border-[#EAE5DE]',
  },
  preparando: {
    label: 'En Cocina',
    className: 'bg-[#FEF9EE] text-[#EAA228] border border-[#F6E3B8]',
  },
  listo: {
    label: 'Listo para Entrega',
    className: 'bg-[#161A1E] text-[#EAA228] border border-[#2D3540]',
  },
  completado: {
    label: 'Completado',
    className: 'bg-[#FAF7F2] text-[#666E7A] border border-[#EAE5DE]',
  },
  rechazado: {
    label: 'Rechazado',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-[#FAF7F2] text-[#8C95A3] border border-[#EAE5DE]',
  },
};


export function OrderManager({
  restaurantId,
  restaurantSlug = '',
  restaurantName = '',
  onGoToTables,
  onGoToComandero,
}: {
  restaurantId: string;
  restaurantSlug?: string;
  restaurantName?: string;
  onGoToTables?: () => void;
  onGoToComandero?: () => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'activos' | 'mesas' | 'pendientes' | 'cobrados' | 'todos'>('activos');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePhone, setSharePhone] = useState('');
  const [isCopiedShareLink, setIsCopiedShareLink] = useState(false);

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
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
    <div className="space-y-8 font-sans text-[#181C20]">
      {/* 1. Header & Filtros Limpios (Whitespace y Jerarquía) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        {/* Píldoras de Filtro Minimalistas */}
        <div className="inline-flex rounded-2xl bg-[#FAF7F2] border border-[#EAE5DE] p-1 shadow-xs overflow-x-auto max-w-full scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter('activos')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'activos'
                ? 'bg-[#EAA228] text-[#181C20] font-black shadow-xs'
                : 'text-[#666E7A] hover:text-[#181C20]'
            }`}
          >
            Activos ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pendientes')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'pendientes'
                ? 'bg-[#EAA228] text-[#181C20] font-black shadow-xs'
                : 'text-[#666E7A] hover:text-[#181C20]'
            }`}
          >
            Por Confirmar ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('mesas')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'mesas'
                ? 'bg-[#EAA228] text-[#181C20] font-black shadow-xs'
                : 'text-[#666E7A] hover:text-[#181C20]'
            }`}
          >
            Mesas Salón
          </button>
          <button
            type="button"
            onClick={() => setFilter('cobrados')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'cobrados'
                ? 'bg-[#1E7E34] text-white font-black shadow-xs'
                : 'text-[#666E7A] hover:text-[#181C20]'
            }`}
          >
            Cobrados Hoy ({paidOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('todos')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'todos'
                ? 'bg-[#181C20] text-white font-black shadow-xs'
                : 'text-[#666E7A] hover:text-[#181C20]'
            }`}
          >
            Historial ({orders.length})
          </button>
        </div>

        {/* Buscador & Estado en Vivo y Refrescar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C95A3]" />
            <input
              type="text"
              placeholder="Buscar mesa, código o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-xl border border-[#D9D3C7] bg-white pl-9 pr-3 text-xs font-semibold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228] shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#666E7A] bg-white border border-[#EAE5DE] px-3 py-2 rounded-xl shadow-xs">
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
            className="h-10 px-3.5 rounded-xl border border-[#D9D3C7] bg-white text-xs font-bold text-[#666E7A] hover:bg-[#FAF7F2] transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#EAA228]' : ''}`} />
            <span>Actualizar</span>
          </button>

          {restaurantSlug && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="h-10 px-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-black transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Enviar Menú WhatsApp</span>
            </button>
          )}

          {onGoToTables && (
            <button
              type="button"
              onClick={onGoToTables}
              className="h-10 px-3.5 rounded-xl border border-[#D9D3C7] bg-white text-xs font-black text-[#181C20] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#EAA228]" />
              <span>Plano de Mesas</span>
            </button>
          )}

          {onGoToComandero && (
            <button
              type="button"
              onClick={onGoToComandero}
              className="h-10 px-3.5 rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-xs font-black text-[#181C20] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>+ Tomar Orden</span>
            </button>
          )}
        </div>
      </div>

      {/* BANNER DE ARQUEO EN VIVO PARA EL CAJERO AL SELECCIONAR 'COBRADOS HOY' */}
      {filter === 'cobrados' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-[#EAE5DE] bg-white p-6 shadow-xs animate-in fade-in duration-150">
          <div>
            <div className="flex items-center gap-1.5 text-[#8C95A3]">
              <Wallet className="w-3.5 h-3.5 text-[#1E7E34]" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Cobrado Hoy</span>
            </div>
            <p className="mt-1.5 text-3xl font-black text-[#1E7E34]">
              ${(paidTotalCents / 100).toFixed(2)}
            </p>
            <p className="text-[11px] text-[#666E7A] mt-0.5">{paidOrders.length} cobros completados</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[#8C95A3]">
              <DollarSign className="w-3.5 h-3.5 text-[#EAA228]" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Efectivo en Gaveta</span>
            </div>
            <p className="mt-1.5 text-3xl font-black text-[#181C20]">
              ${(cashTotalCents / 100).toFixed(2)}
            </p>
            <p className="text-[11px] text-[#666E7A] mt-0.5">{cashCount} cobros en efectivo</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[#8C95A3]">
              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Digital / Tarjeta</span>
            </div>
            <p className="mt-1.5 text-3xl font-black text-[#181C20]">
              ${(digitalTotalCents / 100).toFixed(2)}
            </p>
            <p className="text-[11px] text-[#666E7A] mt-0.5">{digitalCount} cobros bancarios</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[#8C95A3]">
              <Receipt className="w-3.5 h-3.5 text-[#EAA228]" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Ticket Promedio</span>
            </div>
            <p className="mt-1.5 text-3xl font-black text-[#EAA228]">
              ${paidOrders.length > 0 ? (paidTotalCents / (paidOrders.length * 100)).toFixed(2) : '0.00'}
            </p>
            <p className="text-[11px] text-[#666E7A] mt-0.5">Por orden cobrada</p>
          </div>
        </div>
      )}

      {/* 2. Lista de Pedidos en Tarjetas Respiradas y Sin Bordes Duros */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-white border border-[#EAE5DE] p-8 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF9EE] border border-[#F6E3B8] flex items-center justify-center text-[#EAA228] mx-auto mb-3 shadow-xs">
              <ClipboardList className="w-6 h-6 stroke-[2]" />
            </div>
            <p className="text-sm font-extrabold text-[#181C20]">No hay pedidos en esta sección</p>
            <p className="text-xs text-[#666E7A] mt-1">Los nuevos pedidos en vivo aparecerán aquí de forma automática.</p>
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
                className="rounded-2xl border border-[#EAE5DE] bg-white p-6 sm:p-7 shadow-xs hover:border-[#EAA228] transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Contenido Principal */}
                  <div className="flex-1 space-y-4">
                    {/* Fila Superior: Código, Badges Elegantes y Hora */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-black text-[#181C20]">
                        {order.tracking_code}
                      </span>

                      {/* Badge de Estado Sutil */}
                      <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold ${badge.className}`}>
                        {badge.label}
                      </span>

                      {/* Badge de Pago Sutil */}
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold ${
                          isPaid
                            ? 'bg-[#EBF7EE] text-[#1E7E34] border border-emerald-200'
                            : 'bg-[#FEF9EE] text-[#7A642B] border border-[#F6E3B8]'
                        }`}
                      >
                        {isPaid ? `Pagado (${order.payment_method || 'caja'})` : 'Pago al Retirar'}
                      </span>

                      {/* Badge de Ubicación / Paleta */}
                      {order.table_or_token_number && (
                        <span className="inline-flex items-center rounded-full bg-[#FAF7F2] text-[#181C20] border border-[#EAE5DE] px-3 py-0.5 text-xs font-bold">
                          {order.service_type === 'paleta_madera' ? `Paleta #${order.table_or_token_number}` : `Mesa #${order.table_or_token_number}`}
                        </span>
                      )}

                      <span className="text-xs text-[#8C95A3] ml-auto sm:ml-2">
                        {timeStr}
                      </span>
                    </div>

                    {/* Cliente */}
                    <div>
                      <h3 className="text-base font-extrabold text-[#181C20]">
                        {order.customer_name}
                      </h3>
                      <p className="text-xs text-[#666E7A] mt-0.5">
                        {order.customer_phone}
                      </p>
                    </div>

                    {/* Desglose de Productos */}
                    <div className="pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C95A3] mb-2">
                        Detalle de la Orden:
                      </p>
                      <ul className="space-y-1.5 text-xs text-[#181C20]">
                        {order.public_order_items.map((item, idx) => (
                          <li key={`${order.id}-${idx}`} className="flex items-baseline justify-between">
                            <span className="pr-4">
                              <strong className="font-extrabold text-[#181C20]">{item.quantity}×</strong>{' '}
                              <span>{item.product_name}</span>
                              {item.notes && (
                                <span className="text-[#8C95A3] italic ml-1.5 font-normal">
                                  ({item.notes})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-[#666E7A] shrink-0 font-bold">
                              ${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* Fila de Total Minimalista */}
                      <div className="mt-3 pt-3 flex justify-between items-baseline border-t border-[#EAE5DE]">
                        <span className="text-xs font-bold text-[#666E7A]">Total:</span>
                        <span className="text-base font-black text-[#181C20]">
                          ${formattedTotal}
                        </span>
                      </div>
                    </div>

                    {/* Nota del Cliente si existe */}
                    {order.notes && (
                      <p className="text-xs text-[#7A642B] bg-[#FEF9EE] border border-[#F6E3B8] p-3 rounded-xl italic">
                        Nota: {order.notes}
                      </p>
                    )}

                    {order.rejection_reason && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">
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
                        className="h-11 w-full rounded-xl bg-[#EAA228] hover:bg-[#D99318] px-4 text-xs font-black text-[#181C20] shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>{order.service_type === 'mesa_fija' ? 'Cobrar Mesa (Salón)' : 'Cobrar Pedido'}</span>
                      </button>
                    )}

                    {isPaid && (
                      <button
                        type="button"
                        onClick={() => setPrintingOrder(order)}
                        className="h-11 w-full rounded-xl bg-[#1E7E34] hover:bg-[#19692c] text-white px-4 text-xs font-bold shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Reimprimir Comprobante</span>
                      </button>
                    )}

                    {order.status === 'pendiente' && (
                      <button
                        type="button"
                        onClick={() => void transition(order.id, 'confirmado')}
                        className={`h-11 w-full rounded-xl px-4 text-xs font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer ${
                          isPaid
                            ? 'bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] shadow-xs'
                            : 'border border-[#D9D3C7] bg-white text-[#181C20] hover:bg-[#FAF7F2]'
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
                        className={`h-11 w-full rounded-xl px-4 text-xs font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer ${
                          isPaid
                            ? 'bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] shadow-xs'
                            : 'border border-[#D9D3C7] bg-white text-[#181C20] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <span>Marchar en Cocina</span>
                      </button>
                    )}

                    {order.status === 'preparando' && (
                      <button
                        type="button"
                        onClick={() => void transition(order.id, 'listo')}
                        className="h-11 w-full rounded-xl bg-[#EAA228] hover:bg-[#D99318] px-4 text-xs font-black text-[#181C20] shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Marcar Listo para Entrega</span>
                      </button>
                    )}

                    {order.status === 'listo' && (
                      <>
                        {order.customer_phone && (
                          <a
                            href={`https://wa.me/${order.customer_phone.replace(/\D/g, '').startsWith('0') ? '593' + order.customer_phone.replace(/\D/g, '').slice(1) : order.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `¡Hola ${order.customer_name}! 🍽️ Tu pedido *${order.tracking_code}* ya está *LISTO PARA RETIRAR / ENTREGAR* ${
                                order.table_or_token_number
                                  ? `(${order.service_type === 'paleta_madera' ? 'Paleta' : 'Mesa'} #${order.table_or_token_number})`
                                  : ''
                              }. ¡Te esperamos en mostrador!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-11 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-black text-white shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Avisar por WhatsApp</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => void transition(order.id, 'completado')}
                          className="h-11 w-full rounded-xl bg-[#181C20] hover:bg-black px-4 text-xs font-black text-white shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4 text-[#EAA228]" />
                          <span>Entregar al Cliente</span>
                        </button>
                      </>
                    )}

                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => setPrintingOrder(order)}
                        className="h-10 w-full rounded-xl border border-[#D9D3C7] bg-white px-3 text-xs font-bold text-[#181C20] hover:bg-[#FAF7F2] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-[#EAA228]" />
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
                        className="h-9 w-full rounded-xl text-xs font-semibold text-[#8C95A3] hover:text-red-600 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-[#EAE5DE] bg-white p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#EAA228]">Caja & Salón</span>
              <h2 className="text-xl font-black text-[#181C20] mt-0.5">
                Cobrar Pedido #{payingOrder.tracking_code}
              </h2>
              <p className="text-xs text-[#666E7A]">
                Cliente: {payingOrder.customer_name} · Total: ${(payingOrder.total_cents / 100).toFixed(2)}
              </p>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#181C20] mb-1.5">
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
                      className={`h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        payServiceType === s.type
                          ? 'bg-[#161A1E] text-[#EAA228] font-black shadow-xs'
                          : 'bg-[#FAF7F2] border border-[#EAE5DE] text-[#666E7A] hover:bg-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {payServiceType !== 'para_llevar' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#181C20] mb-1.5">
                    Número de {payServiceType === 'paleta_madera' ? 'Paleta' : 'Mesa'}
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Ej: 5"
                    required
                    className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs font-bold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#181C20] mb-1.5">
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
                      className={`h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        payMethod === m.method
                          ? 'bg-[#EAA228] text-[#181C20] font-black shadow-xs'
                          : 'bg-[#FAF7F2] border border-[#EAE5DE] text-[#666E7A] hover:bg-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {payMethod === 'efectivo' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#181C20] mb-1.5">
                    Monto Recibido ($)
                  </label>
                  <input
                    type="text"
                    value={cashAmountInput}
                    onChange={(e) => setCashAmountInput(e.target.value)}
                    className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs font-bold text-[#181C20] focus:outline-none focus:ring-2 focus:ring-[#EAA228]"
                  />
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayingOrder(null)}
                  className="h-11 px-5 rounded-xl border border-[#D9D3C7] text-xs font-bold text-[#666E7A] hover:bg-[#FAF7F2] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="h-11 px-6 rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[28px] border border-[#EAE5DE] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-[#181C20]">
              Rechazar Pedido
            </h3>
            <p className="text-xs text-[#666E7A]">
              Ingresa el motivo que verá el cliente (ej. cocina saturada, ingrediente agotado):
            </p>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo"
              className="w-full h-11 rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-xs text-[#181C20] focus:ring-2 focus:ring-red-400 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingOrderId(null)}
                className="h-10 px-4 rounded-xl border border-[#D9D3C7] text-xs font-bold text-[#666E7A] hover:bg-[#FAF7F2]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRejectOrder}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs cursor-pointer"
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

      {/* Modal de Enviar Menú Digital por WhatsApp */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-[#EAE5DE] bg-white p-6 sm:p-7 shadow-[0_20px_50px_rgba(24,28,32,0.15)] space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#181C20]">Enviar Carta Digital</h3>
                  <p className="text-xs text-[#666E7A]">Comparte el link para que el cliente ordene por WhatsApp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="rounded-xl p-1.5 text-[#8C95A3] hover:bg-[#FAF7F2] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#181C20] mb-1.5">
                  Número de WhatsApp del cliente
                </label>
                <input
                  type="tel"
                  placeholder="Ej. 0991234567 o 593991234567"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 px-3.5 text-sm font-semibold text-[#181C20] outline-none focus:ring-2 focus:ring-[#EAA228]"
                />
              </div>

              <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4 text-xs space-y-2">
                <span className="font-bold text-[#8C95A3] uppercase text-[10px] tracking-wider">
                  Mensaje que recibirá el cliente:
                </span>
                <p className="text-[#181C20] font-medium leading-relaxed italic">
                  &ldquo;¡Hola! Te comparto la carta digital de <strong>{restaurantName || 'nuestro restaurante'}</strong> para que elijas tus platos directamente: <br />
                  <span className="text-[#EAA228] font-bold not-italic underline break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/${restaurantSlug}/pedir` : `/${restaurantSlug}/pedir`}
                  </span>
                  <br />Elige lo que desees y prepararemos tu pedido al instante.&rdquo;
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const clean = sharePhone.replace(/\D/g, '');
                    const fullPhone = clean.startsWith('0') ? `593${clean.slice(1)}` : clean;
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/${restaurantSlug}/pedir` : `/${restaurantSlug}/pedir`;
                    const msg = `¡Hola! Te comparto la carta digital de ${restaurantName || 'nuestro restaurante'} para que hagas tu pedido: ${url}\n\nElige tus platos y te los preparamos al instante.`;
                    const waUrl = fullPhone
                      ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
                      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                    window.open(waUrl, '_blank');
                  }}
                  className="h-11 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Abrir WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/${restaurantSlug}/pedir` : `/${restaurantSlug}/pedir`;
                    void navigator.clipboard.writeText(url);
                    setIsCopiedShareLink(true);
                    setTimeout(() => setIsCopiedShareLink(false), 2000);
                  }}
                  className="h-11 px-4 rounded-xl border border-[#EAE5DE] bg-[#FAF7F2] hover:bg-[#EAE5DE] text-xs font-bold text-[#181C20] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isCopiedShareLink ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopiedShareLink ? 'Copiado' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cobro de Mesa para el Cajero */}
      {checkoutTableOrder && (
        <TableCheckoutModal
          order={checkoutTableOrder}
          onClose={() => setCheckoutTableOrder(null)}
          onAddMoreDishes={onGoToComandero ? () => {
            setCheckoutTableOrder(null);
            onGoToComandero();
          } : undefined}
          onSuccess={() => {
            const tableNum = checkoutTableOrder.tableNumber;
            setCheckoutTableOrder(null);
            void load(true);
          }}
        />
      )}

      {/* Modal de Alerta y Mensajes */}
      <AlertModal
        isOpen={Boolean(error)}
        title="Acción Requerida"
        message={error}
        variant="error"
        onClose={() => setError('')}
      />
    </div>
  );
}
