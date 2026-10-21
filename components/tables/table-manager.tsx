'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  Tag,
  Check,
  Plus,
  CreditCard,
  Users,
  X,
  Bell,
  Flame,
  Clock,
  Utensils,
  Edit2,
  Trash2,
  Layers,
  LayoutGrid,
  ConciergeBell,
  ClipboardList,
} from 'lucide-react';
import type { RestaurantTable, TableStatus, AvailableReservation } from '@/lib/tables/types';
import type { StaffRole } from '@/lib/auth/get-current-staff';
import { TableCheckoutModal, type TableOrderDetails } from './table-checkout-modal';
import { WaiterManager } from '@/components/waiter/waiter-manager';
import { OrderManager } from '@/components/orders/order-manager';

function playWaiterAlertChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
    osc.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.14); // E6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.9);
  } catch {
    // Si no hay interacción de audio previa
  }
}

const statusConfig: Record<
  TableStatus,
  { label: string; bgClass: string; borderClass: string; badgeClass: string; dotClass: string }
> = {
  libre: {
    label: 'Libre',
    bgClass: 'bg-white dark:bg-zinc-900',
    borderClass: 'border-zinc-100 dark:border-zinc-800',
    badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  ocupada: {
    label: 'Ocupada',
    bgClass: 'bg-white dark:bg-zinc-900',
    borderClass: 'border-zinc-100 dark:border-zinc-800',
    badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    dotClass: 'bg-[#f3a806]',
  },
  reservada: {
    label: 'Reservada',
    bgClass: 'bg-white dark:bg-zinc-900',
    borderClass: 'border-zinc-100 dark:border-zinc-800',
    badgeClass: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
};

export function TableManager({
  restaurantId,
  staffId = '',
  userRole,
  initialTableId,
  initialView = 'tables',
}: {
  restaurantId: string;
  staffId?: string;
  userRole: StaffRole;
  initialTableId?: string;
  initialView?: 'tables' | 'comandero' | 'pedidos';
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Vista unificada: Plano de Mesas vs Comandero vs Pedidos
  const [activeTab, setActiveTab] = useState<'tables' | 'comandero' | 'pedidos'>(
    initialView === 'pedidos'
      ? 'pedidos'
      : initialView === 'comandero' || !!initialTableId
      ? 'comandero'
      : 'tables'
  );
  const [comanderoTableId, setComanderoTableId] = useState<string | undefined>(initialTableId);

  const openComanderoForTable = (tableId: string) => {
    setComanderoTableId(tableId);
    setActiveTab('comandero');
  };

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [unassignedReservations, setUnassignedReservations] = useState<AvailableReservation[]>([]);
  const [activePaletas, setActivePaletas] = useState<
    Array<{
      id: string;
      tracking_code: string;
      customer_name: string;
      table_or_token_number: string;
      status: string;
      created_at: string;
      total_cents: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'todas' | TableStatus>('todas');
  const [selectedZone, setSelectedZone] = useState<string>('todas');

  // Estado para crear mesa
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newZone, setNewZone] = useState('Salón Principal');
  const [isCreating, setIsCreating] = useState(false);

  // Estado para editar mesa
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [editCapacity, setEditCapacity] = useState('4');
  const [editZone, setEditZone] = useState('');
  const [isUpdatingTable, setIsUpdatingTable] = useState(false);

  // Estado para generar lote de mesas
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchStart, setBatchStart] = useState('1');
  const [batchCount, setBatchCount] = useState('5');
  const [batchCapacity, setBatchCapacity] = useState('4');
  const [batchZone, setBatchZone] = useState('Salón Principal');
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // Estado para asignar reserva
  const [assigningTable, setAssigningTable] = useState<RestaurantTable | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Estado para cobrar cuenta de mesa (Fase 8)
  const [checkoutOrder, setCheckoutOrder] = useState<TableOrderDetails | null>(null);
  const [isFetchingCheckout, setIsFetchingCheckout] = useState(false);

  const canCreateTable = ['owner', 'admin', 'host'].includes(userRole);

  const loadTables = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('/api/tables');
      if (res.ok) {
        const body = (await res.json()) as { tables: RestaurantTable[] };
        setTables(body.tables || []);
      }

      // Cargar paletas de madera en salón
      const { data: paletasData } = await supabase
        .from('public_order_requests')
        .select('id, tracking_code, customer_name, table_or_token_number, status, created_at, total_cents')
        .eq('restaurant_id', restaurantId)
        .eq('service_type', 'paleta_madera')
        .not('table_or_token_number', 'is', null)
        .in('status', ['confirmado', 'preparando', 'listo']);

      if (paletasData) {
        setActivePaletas(
          paletasData as Array<{
            id: string;
            tracking_code: string;
            customer_name: string;
            table_or_token_number: string;
            status: string;
            created_at: string;
            total_cents: number;
          }>,
        );
      }
    } catch {
      // Ignorar error de red en polling silencioso
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [restaurantId, supabase]);

  async function releasePaleta(orderId: string, tokenNum: string) {
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completado' }),
      });
      setSuccessMsg(`Paleta #${tokenNum} recogida y liberada.`);
      await loadTables(true);
    } catch {
      setError('No se pudo liberar la paleta.');
    }
  }

  const loadUnassignedReservations = useCallback(async () => {
    try {
      const res = await fetch('/api/reservations/unassigned');
      if (res.ok) {
        const body = (await res.json()) as { reservations: AvailableReservation[] };
        setUnassignedReservations(body.reservations || []);
      }
    } catch {
      // Ignorar
    }
  }, []);

  // Carga inicial y subscripción a Realtime
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTables();
      void loadUnassignedReservations();
    }, 0);

    // 1. Canal Supabase Realtime para cambios instantáneos de mesas, órdenes y cocina
    const channel = supabase
      .channel(`realtime-tables-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          void loadTables(true);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          void loadTables(true);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        (payload) => {
          if (payload.new && (payload.new as { status?: string }).status === 'listo') {
            playWaiterAlertChime();
          }
          void loadTables(true);
        },
      )
      .subscribe();

    // 2. Polling de respaldo cada 6 segundos
    const interval = setInterval(() => {
      void loadTables(true);
      void loadUnassignedReservations();
    }, 6000);

    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadTables, loadUnassignedReservations, restaurantId, supabase]);

  // Cambiar estado de mesa
  async function updateTableStatus(tableId: string, nextStatus: TableStatus) {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/tables/${tableId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'No se pudo actualizar el estado de la mesa.');
        return;
      }
      await loadTables(true);
      await loadUnassignedReservations();
    } catch {
      setError('Error al actualizar estado de la mesa.');
    }
  }

  // Abrir modal de cobro de cuenta para mesa ocupada
  async function openTableCheckout(table: RestaurantTable) {
    setError('');
    setIsFetchingCheckout(true);
    try {
      const { data: orderData, error: queryError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          subtotal_cents,
          status,
          order_items (
            id,
            product_name,
            quantity,
            unit_price_cents,
            notes
          )
        `)
        .eq('table_id', table.id)
        .eq('restaurant_id', restaurantId)
        .in('status', ['abierta', 'en_preparacion', 'servida', 'pendiente_pago', 'entregada'])
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setIsFetchingCheckout(false);

      if (queryError || !orderData) {
        const confirmFree = window.confirm(
          `La Mesa #${table.table_number} está marcada como ocupada pero no tiene una comanda activa registrada. ¿Deseas liberar la mesa directamente?`
        );
        if (confirmFree) {
          await updateTableStatus(table.id, 'libre');
        }
        return;
      }

      type RawOrderItem = {
        id: string;
        product_name: string;
        quantity: number;
        unit_price_cents: number;
        notes: string | null;
      };

      const rawItems = ((orderData.order_items as unknown) as RawOrderItem[]) || [];
      const computedSubtotal = rawItems.reduce((acc, it) => acc + (it.unit_price_cents * it.quantity), 0);
      const subtotal = orderData.subtotal_cents > 0 ? orderData.subtotal_cents : computedSubtotal;

      setCheckoutOrder({
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        tableNumber: table.table_number,
        zone: table.zone,
        subtotalCents: subtotal,
        items: rawItems.map((it) => ({
          id: it.id,
          productName: it.product_name,
          quantity: it.quantity,
          unitPriceCents: it.unit_price_cents,
          notes: it.notes,
        })),
      });
    } catch {
      setIsFetchingCheckout(false);
      setError('Error al consultar comanda de la mesa.');
    }
  }

  // Crear nueva mesa
  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const num = parseInt(newTableNumber, 10);
    const cap = parseInt(newCapacity, 10);

    if (isNaN(num) || num <= 0) {
      setError('Ingresa un número de mesa válido mayor a 0.');
      return;
    }
    if (isNaN(cap) || cap <= 0) {
      setError('Ingresa una capacidad de comensales válida mayor a 0.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: num,
          capacity: cap,
          zone: newZone.trim() || undefined,
        }),
      });

      const body = (await res.json()) as { error?: string };
      setIsCreating(false);

      if (!res.ok) {
        setError(body.error ?? 'No se pudo crear la mesa.');
        return;
      }

      setSuccessMsg(`Mesa #${num} creada correctamente.`);
      setShowAddModal(false);
      setNewTableNumber('');
      await loadTables();
    } catch {
      setIsCreating(false);
      setError('Error de red al crear la mesa.');
    }
  }

  // Editar mesa existente
  async function handleEditTable(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTable) return;
    const cap = parseInt(editCapacity, 10);
    if (isNaN(cap) || cap <= 0) {
      setError('Capacidad inválida');
      return;
    }
    setIsUpdatingTable(true);
    try {
      const res = await fetch(`/api/tables/${editingTable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capacity: cap,
          zone: editZone.trim() || null,
        }),
      });
      setIsUpdatingTable(false);
      if (res.ok) {
        setSuccessMsg(`Mesa #${editingTable.table_number} actualizada.`);
        setEditingTable(null);
        await loadTables();
      } else {
        const body = (await res.json()) as { error?: string };
        setError(body.error || 'Error al actualizar mesa.');
      }
    } catch {
      setIsUpdatingTable(false);
      setError('Error de red al actualizar mesa.');
    }
  }

  // Eliminar mesa libre
  async function handleDeleteTable(table: RestaurantTable) {
    if (!confirm(`¿Eliminar permanentemente la Mesa #${table.table_number}?`)) return;
    try {
      const res = await fetch(`/api/tables/${table.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessMsg(`Mesa #${table.table_number} eliminada del salón.`);
        await loadTables();
      } else {
        const body = (await res.json()) as { error?: string };
        setError(body.error || 'No se pudo eliminar la mesa.');
      }
    } catch {
      setError('Error de red al eliminar mesa.');
    }
  }

  // Generar lote de mesas
  async function handleCreateBatchTables(e: React.FormEvent) {
    e.preventDefault();
    const start = parseInt(batchStart, 10);
    const count = parseInt(batchCount, 10);
    const cap = parseInt(batchCapacity, 10);
    if (isNaN(start) || isNaN(count) || isNaN(cap) || start <= 0 || count <= 0 || cap <= 0) {
      setError('Verifica los datos del lote.');
      return;
    }
    setIsCreatingBatch(true);
    try {
      const res = await fetch('/api/tables/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startNumber: start,
          count,
          capacity: cap,
          zone: batchZone.trim() || undefined,
        }),
      });
      const body = (await res.json()) as { error?: string; message?: string };
      setIsCreatingBatch(false);
      if (res.ok) {
        setSuccessMsg(body.message || 'Lote de mesas generado exitosamente.');
        setShowBatchModal(false);
        await loadTables();
      } else {
        setError(body.error || 'Error al crear lote de mesas.');
      }
    } catch {
      setIsCreatingBatch(false);
      setError('Error de red al crear lote de mesas.');
    }
  }

  // Asignar reserva a mesa
  async function handleAssignReservation(reservationId: string) {
    if (!assigningTable) return;
    setError('');
    setSuccessMsg('');
    setIsAssigning(true);

    try {
      const res = await fetch(`/api/tables/${assigningTable.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      });

      const body = (await res.json()) as { error?: string; message?: string };
      setIsAssigning(false);

      if (!res.ok) {
        setError(body.error ?? 'No se pudo asignar la reserva a esta mesa.');
        return;
      }

      setSuccessMsg(body.message ?? 'Reserva asignada exitosamente.');
      setAssigningTable(null);
      await loadTables();
      await loadUnassignedReservations();
    } catch {
      setIsAssigning(false);
      setError('Error de red al asignar la reserva.');
    }
  }

  // Métricas
  const totalTables = tables.length;
  const freeTables = tables.filter((t) => t.status === 'libre').length;
  const occupiedTables = tables.filter((t) => t.status === 'ocupada').length;
  const reservedTables = tables.filter((t) => t.status === 'reservada').length;
  const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0);
  const occupancyPercentage = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  // Extraer zonas únicas
  const zones = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.zone) set.add(t.zone);
    });
    return Array.from(set);
  }, [tables]);

  // Filtrado de mesas
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchStatus = statusFilter === 'todas' || t.status === statusFilter;
      const matchZone = selectedZone === 'todas' || (t.zone || 'Sin zona') === selectedZone;
      return matchStatus && matchZone;
    });
  }, [tables, statusFilter, selectedZone]);

  return (
    <div className="space-y-6">
      {/* Switch de Vista del Cajero: Mesas, Comandero y Caja/Cobros */}
      <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 sm:p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'tables'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-[#f3a806]" />
              <span>1. Plano de Mesas & Salón</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'tables' ? 'bg-[#f3a806]/20 text-zinc-950 dark:text-amber-300' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}>
                {occupiedTables}/{totalTables}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setComanderoTableId(undefined);
                setActiveTab('comandero');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'comandero'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <ConciergeBell className="w-4 h-4 text-[#f3a806]" />
              <span>2. Comandero & Tomar Comanda</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pedidos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pedidos'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-[#f3a806]" />
              <span>3. Caja, Pedidos & Cobros</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium">
              {activeTab === 'tables' && 'Plano de ocupación en vivo y cobro de cuentas'}
              {activeTab === 'comandero' && 'Toma rápida de comandas en mesa y mostrador'}
              {activeTab === 'pedidos' && 'Cola de cobro, arqueo diario en vivo e impresión'}
            </span>
          </div>
        </div>
      </div>

      {activeTab === 'comandero' ? (
        <div className="space-y-4">
          <WaiterManager
            restaurantId={restaurantId}
            waiterId={staffId}
            initialTableId={comanderoTableId}
            onBackToTables={() => {
              setActiveTab('tables');
              void loadTables(true);
            }}
            onGoToOrders={() => {
              setActiveTab('pedidos');
            }}
          />
        </div>
      ) : activeTab === 'pedidos' ? (
        <div className="space-y-4">
          <OrderManager
            restaurantId={restaurantId}
            onGoToTables={() => {
              setActiveTab('tables');
              void loadTables(true);
            }}
            onGoToComandero={() => {
              setComanderoTableId(undefined);
              setActiveTab('comandero');
            }}
          />
        </div>
      ) : (
        <>
          {/* Tarjetas de Métricas KPI del Salón */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Total Mesas</p>
          <p className="mt-1 text-2xl font-bold">{totalTables}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{occupancyPercentage}% ocupación</p>
        </div>

        <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Libres</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-300">{freeTables}</p>
          <p className="mt-1 text-[11px] text-emerald-600/80">Listas para sentar</p>
        </div>

        <div className="rounded-xl border bg-rose-500/10 border-rose-500/20 p-4 shadow-sm">
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">Ocupadas</p>
          <p className="mt-1 text-2xl font-bold text-rose-800 dark:text-rose-300">{occupiedTables}</p>
          <p className="mt-1 text-[11px] text-rose-600/80">Clientes comiendo</p>
        </div>

        <div className="rounded-xl border bg-amber-500/10 border-amber-500/20 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Reservadas</p>
          <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-300">{reservedTables}</p>
          <p className="mt-1 text-[11px] text-amber-600/80">En espera de cliente</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Capacidad Total</p>
          <p className="mt-1 text-2xl font-bold">{totalCapacity}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">asientos en el local</p>
        </div>
      </div>

      {/* Avisos */}
      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {successMsg && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {successMsg}
        </div>
      )}

      {/* Barra de Filtros y Acciones */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Estado */}
          <div className="inline-flex rounded-lg border bg-card p-1 text-xs">
            {(['todas', 'libre', 'ocupada', 'reservada'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'todas' ? 'Todas' : statusConfig[st].label}
              </button>
            ))}
          </div>

          {/* Filtro por Zona */}
          {zones.length > 0 && (
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="h-8 rounded-lg border bg-card px-2.5 text-xs text-foreground focus:outline-none"
            >
              <option value="todas">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Realtime activo
          </span>

          {canCreateTable && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-2xs transition-colors"
              >
                <Layers className="w-3.5 h-3.5 mr-1" />
                <span>Generar Lote</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#f3a806] hover:bg-[#e09804] px-4 text-xs font-bold text-zinc-950 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Nueva Mesa</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN: Paletas / Fichas de Madera en Salón (Modo Fast Casual) */}
      {activePaletas.length > 0 && (
        <section className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40">
                <Tag className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Paletas / Fichas en Circulación ({activePaletas.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Clientes sentados en el salón comiendo con número móvil. Al limpiar la mesa o recoger el número, presiona &ldquo;Liberar&rdquo;.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
              {activePaletas.length} mesas ocupadas
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pt-1">
            {activePaletas.map((pal) => (
              <div
                key={pal.id}
                className="flex flex-col justify-between rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 p-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                      Paleta #{pal.table_or_token_number}
                    </span>
                    <span className="text-[10px] rounded-full bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 font-mono text-zinc-500">
                      {new Date(pal.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">{pal.customer_name}</p>
                  <p className="text-[11px] text-zinc-400">
                    Código: {pal.tracking_code} · ${(pal.total_cents / 100).toFixed(2)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void releasePaleta(pal.id, pal.table_or_token_number)}
                  className="mt-3 h-8 w-full rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Recoger y Liberar</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Grid Visual de Mesas */}
      {loading && !tables.length ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Cargando mesas del restaurante...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredTables.map((table) => {
            const config = statusConfig[table.status];
            const hasReservation = table.status === 'reservada' && table.active_reservation;

            const isFoodReady = table.status === 'ocupada' && table.active_order?.kitchen_status === 'listo';
            const isPreparing = table.status === 'ocupada' && table.active_order?.kitchen_status === 'preparando';
            const isPending = table.status === 'ocupada' && table.active_order?.kitchen_status === 'pendiente';

            return (
              <article
                key={table.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
                  isFoodReady
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : `${config.borderClass} ${config.bgClass}`
                }`}
              >
                {/* Cabecera de la Mesa */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {table.zone || 'Salón'}
                      </span>
                      <h3 className="text-2xl font-extrabold tracking-tight">Mesa #{table.table_number}</h3>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
                        <span>{config.label}</span>
                      </div>
                      {canCreateTable && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTable(table);
                              setEditCapacity(table.capacity.toString());
                              setEditZone(table.zone || '');
                            }}
                            title="Editar mesa"
                            className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {table.status === 'libre' && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteTable(table)}
                              title="Eliminar mesa"
                              className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Capacidad */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>Capacidad: {table.capacity} personas</span>
                  </div>

                  {/* ESTADO EN VIVO DE COCINA */}
                  {isFoodReady && (
                    <div className="mt-3 rounded-xl border border-emerald-500/50 bg-emerald-500/15 p-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-1.5 font-extrabold">
                        <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>¡Comida Lista para Servir!</span>
                      </div>
                      <span className="font-mono text-[10px] bg-emerald-600 text-white dark:bg-emerald-500 px-2 py-0.5 rounded-full font-bold">
                        {table.active_order?.ready_items_count}/{table.active_order?.items_count} listos
                      </span>
                    </div>
                  )}

                  {isPreparing && (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>En preparación en cocina</span>
                      </div>
                      <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                        #{table.active_order?.order_number}
                      </span>
                    </div>
                  )}

                  {isPending && (
                    <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-2 text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>En cola de cocina</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold">
                        #{table.active_order?.order_number}
                      </span>
                    </div>
                  )}

                  {/* Si tiene reserva asignada */}
                  {hasReservation && (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-background/90 p-3 text-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-800 dark:text-amber-300">
                          {table.active_reservation?.customer_name}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(table.active_reservation?.date_time || '').toLocaleTimeString('es-EC', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {table.active_reservation?.guests} personas · Tel: {table.active_reservation?.customer_phone}
                      </p>
                      {table.active_reservation?.notes && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground">
                          Nota: {table.active_reservation.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Botones de Cambio de Estado Rápido */}
                <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {table.status === 'libre' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void updateTableStatus(table.id, 'ocupada')}
                          className="h-9 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-2 text-xs font-bold text-zinc-950 shadow-xs transition-colors"
                        >
                          Sentar Clientes
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssigningTable(table)}
                          className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Asignar Reserva
                        </button>
                        <button
                          type="button"
                          onClick={() => openComanderoForTable(table.id)}
                          className="col-span-2 flex h-8 items-center justify-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        >
                          <Utensils className="h-3.5 w-3.5 text-primary" />
                          <span>Tomar Comanda</span>
                        </button>
                      </>
                    )}

                    {table.status === 'ocupada' && (
                      <div className="col-span-2 flex flex-col gap-2">
                        {table.active_order?.is_paid && (
                          <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <span className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                              <span>Cuenta Pagada (Pre-pago)</span>
                            </span>
                            <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                              ${((table.active_order.total_cents || 0) / 100).toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openComanderoForTable(table.id)}
                            className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                          >
                            <Utensils className="h-3.5 w-3.5 text-primary" />
                            <span>+ Comanda</span>
                          </button>

                          {table.active_order?.is_paid ? (
                            <button
                              type="button"
                              onClick={() => void updateTableStatus(table.id, 'libre')}
                              className="h-9 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-2 text-xs font-bold text-zinc-950 shadow-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>Liberar Mesa</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void openTableCheckout(table)}
                              disabled={isFetchingCheckout}
                              className="h-9 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-2 text-xs font-bold text-zinc-950 shadow-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Cobrar</span>
                            </button>
                          )}
                        </div>

                        {!table.active_order?.is_paid && (
                          <button
                            type="button"
                            onClick={() => void updateTableStatus(table.id, 'libre')}
                            className="h-8 w-full rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                          >
                            Liberar Mesa
                          </button>
                        )}
                      </div>
                    )}

                    {table.status === 'reservada' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void updateTableStatus(table.id, 'ocupada')}
                          className="h-9 rounded-full bg-[#f3a806] hover:bg-[#e09804] px-2 text-xs font-bold text-zinc-950 shadow-xs transition-colors"
                        >
                          Llegó Cliente
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateTableStatus(table.id, 'libre')}
                          className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Liberar
                        </button>
                        <button
                          type="button"
                          onClick={() => openComanderoForTable(table.id)}
                          className="col-span-2 flex h-8 items-center justify-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        >
                          <Utensils className="h-3.5 w-3.5 text-primary" />
                          <span>Adelantar Comanda</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!filteredTables.length && !loading && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-base font-semibold">No se encontraron mesas con los filtros seleccionados.</p>
          <p className="mt-1 text-xs">Puedes ajustar el estado o agregar una nueva mesa al restaurante.</p>
        </div>
      )}

      {/* MODAL: Crear Nueva Mesa */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold">Agregar Nueva Mesa</h3>
            <p className="mt-1 text-xs text-muted-foreground">Registra una mesa física para el control del salón.</p>

            <form onSubmit={(e) => void handleCreateTable(e)} className="mt-4 space-y-3">
              <div>
                <label htmlFor="modalTableNum" className="block text-xs font-medium text-muted-foreground mb-1">
                  Número de Mesa *
                </label>
                <input
                  id="modalTableNum"
                  type="number"
                  min="1"
                  max="999"
                  required
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="Ej. 2"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label htmlFor="modalCapacity" className="block text-xs font-medium text-muted-foreground mb-1">
                  Capacidad de Comensales (Sillas) *
                </label>
                <input
                  id="modalCapacity"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  placeholder="Ej. 4"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label htmlFor="modalZone" className="block text-xs font-medium text-muted-foreground mb-1">
                  Zona / Área (Opcional)
                </label>
                <input
                  id="modalZone"
                  type="text"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="Ej. Terraza, VIP, Salón 1"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-9 flex-1 rounded-lg border bg-background text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="h-9 flex-1 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreating ? 'Guardando...' : 'Crear Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Mesa */}
      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold">Editar Mesa #{editingTable.table_number}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajusta la cantidad de asientos o el sector asignado.
            </p>

            <form onSubmit={(e) => void handleEditTable(e)} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Capacidad de Comensales (Sillas) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Zona / Área (Opcional)
                </label>
                <input
                  type="text"
                  value={editZone}
                  onChange={(e) => setEditZone(e.target.value)}
                  placeholder="Ej. Salón Principal, Terraza, VIP"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="h-9 flex-1 rounded-lg border bg-background text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTable}
                  className="h-9 flex-1 rounded-lg bg-[#f3a806] hover:bg-[#e09804] text-xs font-bold text-zinc-950 shadow-xs"
                >
                  {isUpdatingTable ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Generar Lote de Mesas */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold">Generar Lote de Mesas</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Crea múltiples mesas consecutivas rápidamente (ej. Mesas de la 1 a la 10).
            </p>

            <form onSubmit={(e) => void handleCreateBatchTables(e)} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Número Inicial *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    required
                    value={batchStart}
                    onChange={(e) => setBatchStart(e.target.value)}
                    placeholder="1"
                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Cantidad a Crear *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    placeholder="10"
                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Capacidad por Mesa (Sillas) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={batchCapacity}
                  onChange={(e) => setBatchCapacity(e.target.value)}
                  placeholder="4"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Zona / Área
                </label>
                <input
                  type="text"
                  value={batchZone}
                  onChange={(e) => setBatchZone(e.target.value)}
                  placeholder="Ej. Salón Principal"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="h-9 flex-1 rounded-lg border bg-background text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBatch}
                  className="h-9 flex-1 rounded-lg bg-[#f3a806] hover:bg-[#e09804] text-xs font-bold text-zinc-950 shadow-xs"
                >
                  {isCreatingBatch ? 'Generando...' : 'Crear Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Asignar Reserva a Mesa */}
      {assigningTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Asignar Reserva a Mesa #{assigningTable.table_number}</h3>
                <p className="text-xs text-muted-foreground">
                  Capacidad de la mesa: {assigningTable.capacity} personas · Zona: {assigningTable.zone || 'Salón'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTable(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {unassignedReservations.map((res) => {
                const exceedsCapacity = res.guests > assigningTable.capacity;
                return (
                  <div
                    key={res.id}
                    className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-sm">{res.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {res.guests} personas · Tel: {res.customer_phone}
                      </p>
                      <p className="text-[11px] font-mono text-primary">
                        Hora: {new Date(res.date_time).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {res.notes && <p className="text-[10px] italic text-muted-foreground">Nota: {res.notes}</p>}
                    </div>

                    <button
                      type="button"
                      disabled={isAssigning || exceedsCapacity}
                      onClick={() => void handleAssignReservation(res.id)}
                      className={`h-8 rounded-lg px-3 text-xs font-semibold shadow-xs transition-colors ${
                        exceedsCapacity
                          ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                      title={exceedsCapacity ? 'Excede la capacidad de la mesa' : 'Asignar'}
                    >
                      {exceedsCapacity ? 'Excede Cupo' : 'Asignar'}
                    </button>
                  </div>
                );
              })}

              {!unassignedReservations.length && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No hay reservas pendientes sin mesa asignada para hoy.
                </div>
              )}
            </div>

            <div className="mt-4 border-t pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setAssigningTable(null)}
                className="h-8 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Modal de Cobro de Mesa (Fase 8) */}
      {checkoutOrder && (
        <TableCheckoutModal
          order={checkoutOrder}
          onClose={() => setCheckoutOrder(null)}
          onSuccess={() => {
            const tableNum = checkoutOrder.tableNumber;
            setCheckoutOrder(null);
            setSuccessMsg(`¡Cuenta de Mesa #${tableNum} cobrada exitosamente!`);
            void loadTables(true);
          }}
        />
      )}
    </div>
  );
}
