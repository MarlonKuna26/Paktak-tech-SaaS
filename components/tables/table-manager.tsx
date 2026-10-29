'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
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
  Lock,
  Wallet,
  MessageCircle,
  Copy,
  CheckCheck,
} from 'lucide-react';
import type { RestaurantTable, TableStatus, AvailableReservation } from '@/lib/tables/types';
import type { StaffRole } from '@/lib/auth/get-current-staff';
import { TableCheckoutModal, type TableOrderDetails } from './table-checkout-modal';
import { WaiterManager } from '@/components/waiter/waiter-manager';
import { OrderManager } from '@/components/orders/order-manager';
import { CashShiftManager } from '@/components/shifts/cash-shift-manager';
import { ConfirmModal } from '@/components/ui/confirm-modal';

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
    bgClass: 'bg-white',
    borderClass: 'border-[#EAE5DE]',
    badgeClass: 'bg-[#FAF7F2] text-[#666E7A] border border-[#EAE5DE]',
    dotClass: 'bg-emerald-500',
  },
  ocupada: {
    label: 'Ocupada',
    bgClass: 'bg-[#FEF9EE]',
    borderClass: 'border-[#EAA228]/50',
    badgeClass: 'bg-[#EAA228]/15 text-[#8F5E00] border border-[#EAA228]/40',
    dotClass: 'bg-[#EAA228]',
  },
  reservada: {
    label: 'Reservada',
    bgClass: 'bg-white',
    borderClass: 'border-[#EAE5DE]',
    badgeClass: 'bg-[#161A1E] text-[#EAA228] border border-[#161A1E]',
    dotClass: 'bg-[#EAA228]',
  },
};


export function TableManager({
  restaurantId,
  staffId = '',
  userRole,
  restaurantSlug = '',
  restaurantName = '',
  initialTableId,
  initialView = 'tables',
}: {
  restaurantId: string;
  staffId?: string;
  userRole: StaffRole;
  restaurantSlug?: string;
  restaurantName?: string;
  initialTableId?: string;
  initialView?: 'tables' | 'comandero' | 'pedidos' | 'caja';
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Vista unificada: Plano de Mesas vs Comandero vs Pedidos vs Turnos de Caja
  const [activeTab, setActiveTab] = useState<'tables' | 'comandero' | 'pedidos' | 'caja'>(
    initialView === 'caja'
      ? 'caja'
      : initialView === 'pedidos'
      ? 'pedidos'
      : initialView === 'comandero' || !!initialTableId
      ? 'comandero'
      : 'tables'
  );
  const [comanderoTableId, setComanderoTableId] = useState<string | undefined>(initialTableId);
  const [showShareMenuModal, setShowShareMenuModal] = useState(false);
  const [whatsappPhoneInput, setWhatsappPhoneInput] = useState('');
  const [isCopiedMenuLink, setIsCopiedMenuLink] = useState(false);

  const openComanderoForTable = (tableId: string) => {
    setComanderoTableId(tableId);
    setActiveTab('comandero');
  };

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [unassignedReservations, setUnassignedReservations] = useState<AvailableReservation[]>([]);
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
  const [readyAlerts, setReadyAlerts] = useState<
    Array<{ id: string; productName: string; quantity: number; time: string }>
  >([]);

  // Modal de confirmación suave (sin alert de navegador)
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'orange' | 'danger';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const canCreateTable = ['owner', 'admin', 'host'].includes(userRole);

  const loadTables = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('/api/tables');
      if (res.ok) {
        const body = (await res.json()) as { tables: RestaurantTable[] };
        setTables(body.tables || []);
      }

    } catch {
      // Ignorar error de red en polling silencioso
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

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
            const newItem = payload.new as { id?: string; product_name?: string; quantity?: number };
            const alertId = `${Date.now()}-${Math.random()}`;
            setReadyAlerts((prev) => [
              {
                id: alertId,
                productName: newItem.product_name ?? 'Platillo',
                quantity: newItem.quantity ?? 1,
                time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
              },
              ...prev.slice(0, 2),
            ]);
            setTimeout(() => {
              setReadyAlerts((prev) => prev.filter((a) => a.id !== alertId));
            }, 8000);
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

  // Marcar todos los platos de una comanda como servidos en mesa
  async function handleServeOrder(orderId: string) {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/orders/${orderId}/serve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'No se pudo marcar la comida como servida.');
        return;
      }
      setSuccessMsg('¡Comida marcada como servida en mesa!');
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadTables(true);
    } catch {
      setError('Error al marcar comida como servida.');
    }
  }

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
            notes,
            status
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
        setConfirmModalData({
          isOpen: true,
          title: `Liberar Mesa #${table.table_number}`,
          description: `La Mesa #${table.table_number} está marcada como ocupada pero no tiene una orden activa registrada. ¿Deseas liberar la mesa de inmediato para dejarla disponible?`,
          confirmText: 'Liberar Mesa',
          variant: 'orange',
          onConfirm: async () => {
            await updateTableStatus(table.id, 'libre');
            setConfirmModalData(null);
          },
        });
        return;
      }

      type RawOrderItem = {
        id: string;
        product_name: string;
        quantity: number;
        unit_price_cents: number;
        notes: string | null;
        status?: string;
      };

      const rawItems = ((orderData.order_items as unknown) as RawOrderItem[]) || [];
      const computedSubtotal = rawItems.reduce((acc, it) => acc + (it.unit_price_cents * it.quantity), 0);
      const subtotal = orderData.subtotal_cents > 0 ? orderData.subtotal_cents : computedSubtotal;
      const isServido = rawItems.length > 0 && rawItems.every((it) => it.status === 'entregado');

      setCheckoutOrder({
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        tableNumber: table.table_number,
        zone: table.zone,
        subtotalCents: subtotal,
        isServido,
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
      setError('Error al consultar orden de la mesa.');
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
  function handleDeleteTable(table: RestaurantTable) {
    setConfirmModalData({
      isOpen: true,
      title: `Eliminar Mesa #${table.table_number}`,
      description: `¿Estás seguro de que deseas eliminar permanentemente la Mesa #${table.table_number} del salón? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Mesa',
      variant: 'danger',
      onConfirm: async () => {
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
        } finally {
          setConfirmModalData(null);
        }
      },
    });
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
      {/* Toast Flotante de Alerta de Cocina en Tiempo Real para el Cajero */}
      {readyAlerts.length > 0 && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto">
          {readyAlerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-900 p-4 shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-black shadow-xs">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    ¡Plato Listo en Cocina!
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-mono">{alert.time}</span>
                </div>
                <p className="mt-1 text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                  {alert.quantity}× {alert.productName}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Listo para recoger de la barra y despachar al salón.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('tables');
                      setReadyAlerts((prev) => prev.filter((a) => a.id !== alert.id));
                    }}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ver Plano de Mesas
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadyAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                    className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-1 text-xs font-semibold hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Switch de Vista del Cajero: Mesas, Comandero y Caja/Cobros */}
      <div className="rounded-2xl border border-[#EAE5DE] bg-white p-2.5 sm:p-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF7F2] border border-[#EAE5DE] overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('tables')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'tables'
                  ? 'bg-[#EAA228] text-[#181C20] shadow-xs'
                  : 'text-[#666E7A] hover:text-[#181C20]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-[#181C20]" />
              <span>1. Plano de Mesas & Salón</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'tables' ? 'bg-white/40 text-[#181C20]' : 'bg-[#EAE5DE] text-[#666E7A]'
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'comandero'
                  ? 'bg-[#EAA228] text-[#181C20] shadow-xs'
                  : 'text-[#666E7A] hover:text-[#181C20]'
              }`}
            >
              <ConciergeBell className="w-4 h-4 text-[#181C20]" />
              <span>2. Tomar Orden</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pedidos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pedidos'
                  ? 'bg-[#EAA228] text-[#181C20] shadow-xs'
                  : 'text-[#666E7A] hover:text-[#181C20]'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-[#181C20]" />
              <span>3. Caja, Pedidos & Cobros</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('caja')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'caja'
                  ? 'bg-[#EAA228] text-[#181C20] shadow-xs'
                  : 'text-[#666E7A] hover:text-[#181C20]'
              }`}
            >
              <Wallet className="w-4 h-4 text-[#181C20]" />
              <span>4. Turnos & Arqueo de Caja</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {restaurantSlug && (
              <button
                type="button"
                onClick={() => setShowShareMenuModal(true)}
                className="h-9 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-black transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enviar Carta WhatsApp</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#666E7A] px-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-bold">
                {activeTab === 'tables' && 'Plano de ocupación en vivo y cobro de cuentas'}
                {activeTab === 'comandero' && 'Toma rápida de órdenes en mesa y mostrador'}
                {activeTab === 'pedidos' && 'Cola de cobro, arqueo diario en vivo e impresión'}
                {activeTab === 'caja' && 'Apertura de turno, fondo inicial y arqueo de gaveta'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'caja' ? (
        <div className="space-y-4">
          <CashShiftManager restaurantId={restaurantId} userRole={userRole} />
        </div>
      ) : activeTab === 'comandero' ? (
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
            restaurantSlug={restaurantSlug}
            restaurantName={restaurantName}
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
            <div className="rounded-2xl border border-[#EAE5DE] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#666E7A]">Total Mesas</p>
              <p className="mt-1 text-2xl font-black text-[#181C20]">{totalTables}</p>
              <p className="mt-0.5 text-xs text-[#8C95A3]">{occupancyPercentage}% ocupación actual</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Libres</p>
              <p className="mt-1 text-2xl font-black text-emerald-700">{freeTables}</p>
              <p className="mt-0.5 text-xs text-emerald-600">Listas para sentar</p>
            </div>

            <div className="rounded-2xl border border-[#EAA228]/50 bg-[#FEF9EE] p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#8F5E00]">Ocupadas</p>
              <p className="mt-1 text-2xl font-black text-[#EAA228]">{occupiedTables}</p>
              <p className="mt-0.5 text-xs text-[#8F5E00]/80">Clientes comiendo</p>
            </div>

            <div className="rounded-2xl border border-[#EAE5DE] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#181C20]">Reservadas</p>
              <p className="mt-1 text-2xl font-black text-[#181C20]">{reservedTables}</p>
              <p className="mt-0.5 text-xs text-[#8C95A3]">En espera de cliente</p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-[#EAE5DE] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#666E7A]">Capacidad Total</p>
              <p className="mt-1 text-2xl font-black text-[#181C20]">{totalCapacity}</p>
              <p className="mt-0.5 text-xs text-[#8C95A3]">asientos en el local</p>
            </div>
          </div>

          {/* Avisos */}
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800">
              {successMsg}
            </div>
          )}

          {/* Barra de Filtros y Acciones */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Estado */}
              <div className="inline-flex rounded-xl border border-[#EAE5DE] bg-[#FAF7F2] p-1 text-xs">
                {(['todas', 'libre', 'ocupada', 'reservada'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-lg px-3 py-1 font-black capitalize transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#EAA228] text-[#181C20] shadow-xs'
                        : 'text-[#666E7A] hover:text-[#181C20]'
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
                  className="h-9 rounded-xl border border-[#EAE5DE] bg-white px-3 text-xs font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:border-transparent outline-none cursor-pointer"
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE5DE] bg-white px-3 py-1 text-[11px] font-bold text-[#666E7A]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Realtime activo
              </span>

              {canCreateTable && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(true)}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-[#EAE5DE] bg-white px-3.5 text-xs font-black text-[#181C20] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 mr-1 text-[#EAA228]" />
                    <span>Generar Lote</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-[#EAA228] hover:bg-[#D99318] px-4 text-xs font-black text-[#181C20] shadow-sm transition-all hover:shadow cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Nueva Mesa</span>
                  </button>
                </div>
              )}
            </div>
          </div>



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
            const isServido = table.status === 'ocupada' && table.active_order?.kitchen_status === 'servido';
            const hasActiveOrder = Boolean(table.active_order);
            const canLiberarMesa = !hasActiveOrder || isServido;

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
                    <div className="mt-3 rounded-xl border border-emerald-500/50 bg-emerald-500/15 p-2.5 text-xs text-emerald-900 dark:text-emerald-200 flex flex-col gap-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-extrabold">
                          <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>¡Comida Lista para Servir!</span>
                        </div>
                        <span className="font-mono text-[10px] bg-emerald-600 text-white dark:bg-emerald-500 px-2 py-0.5 rounded-full font-bold">
                          {table.active_order?.ready_items_count}/{table.active_order?.items_count} listos
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleServeOrder(table.active_order!.id)}
                        className="h-7.5 w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Marcar como Servido en Mesa</span>
                      </button>
                    </div>
                  )}

                  {isPreparing && (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>En preparación en cocina</span>
                        </div>
                        <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                          #{table.active_order?.order_number}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => void handleServeOrder(table.active_order!.id)}
                          className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Si los platos ya fueron llevados a la mesa"
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>¿Ya se sirvió? Marcar servido</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isPending && (
                    <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>En cola de cocina</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold">
                          #{table.active_order?.order_number}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => void handleServeOrder(table.active_order!.id)}
                          className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Si los platos ya fueron llevados a la mesa"
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>¿Ya se sirvió? Marcar servido</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isServido && (
                    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">Comida servida en mesa</span>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
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
                          onClick={() => openComanderoForTable(table.id)}
                          className="h-9 rounded-full bg-[#EAA228] hover:bg-[#D99318] px-2 text-xs font-bold text-zinc-950 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Utensils className="h-3.5 w-3.5 text-zinc-950" />
                          <span>Tomar Orden</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssigningTable(table)}
                          className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        >
                          Asignar Reserva
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
                            <span>+ Orden</span>
                          </button>

                          {table.active_order?.is_paid ? (
                            canLiberarMesa ? (
                              <button
                                type="button"
                                onClick={() => void updateTableStatus(table.id, 'libre')}
                                className="h-9 rounded-full bg-[#EAA228] hover:bg-[#D99318] px-2 text-xs font-bold text-zinc-950 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>Liberar Mesa</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="No puedes liberar la mesa hasta que la comida esté servida en mesa"
                                className="h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 cursor-not-allowed flex items-center justify-center gap-1.5 opacity-75"
                              >
                                <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>Liberar Mesa</span>
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => void openTableCheckout(table)}
                              disabled={isFetchingCheckout}
                              className="h-9 rounded-full bg-[#EAA228] hover:bg-[#D99318] px-2 text-xs font-bold text-zinc-950 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Cobrar</span>
                            </button>
                          )}
                        </div>

                        {/* Indicador y bloqueo cuando la comida aún no se ha servido */}
                        {table.active_order?.is_paid && !canLiberarMesa && (
                          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-300/40">
                            <Lock className="w-3 h-3 shrink-0" />
                            <span>Comida no servida aún • Servir antes de liberar</span>
                          </div>
                        )}

                        {/* Si la mesa está ocupada pero no tiene ninguna comanda activa */}
                        {!hasActiveOrder && (
                          <button
                            type="button"
                            onClick={() => void updateTableStatus(table.id, 'libre')}
                            className="h-8 w-full rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                          >
                            Liberar Mesa (Sin Comanda)
                          </button>
                        )}
                      </div>
                    )}

                    {table.status === 'reservada' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void updateTableStatus(table.id, 'ocupada')}
                          className="h-9 rounded-full bg-[#EAA228] hover:bg-[#D99318] px-2 text-xs font-bold text-zinc-950 shadow-xs transition-colors"
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
                          <span>Adelantar Orden</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Agregar Nueva Mesa</h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Registra una mesa física para el control del salón.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateTable(e)} className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="modalTableNum" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
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
                  className="h-10 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white focus:border-[#EAA228] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="modalCapacity" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
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
                  className="h-10 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white focus:border-[#EAA228] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="modalZone" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Zona / Área (Opcional)
                </label>
                <input
                  id="modalZone"
                  type="text"
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="Ej. Terraza, VIP, Salón 1"
                  className="h-10 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white focus:border-[#EAA228] focus:outline-none transition-colors"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 flex-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 flex-1 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-xs font-black text-zinc-950 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Editar Mesa #{editingTable.table_number}</h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Ajusta la cantidad de asientos o el sector asignado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleEditTable(e)} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Capacidad de Comensales (Sillas) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white focus:border-[#EAA228] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Zona / Área (Opcional)
                </label>
                <input
                  type="text"
                  value={editZone}
                  onChange={(e) => setEditZone(e.target.value)}
                  placeholder="Ej. Salón Principal, Terraza, VIP"
                  className="h-10 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white focus:border-[#EAA228] focus:outline-none transition-colors"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="h-10 flex-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTable}
                  className="h-10 flex-1 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-xs font-black text-zinc-950 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Generar Lote de Mesas</h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Crea múltiples mesas consecutivas rápidamente (ej. Mesas de la 1 a la 10).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateBatchTables(e)} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
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
                    className="h-10 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white focus:border-[#EAA228] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
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
                    className="h-10 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white focus:border-[#EAA228] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
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
                  className="h-10 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white focus:border-[#EAA228] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Zona / Área
                </label>
                <input
                  type="text"
                  value={batchZone}
                  onChange={(e) => setBatchZone(e.target.value)}
                  placeholder="Ej. Salón Principal"
                  className="h-10 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white focus:border-[#EAA228] focus:outline-none transition-colors"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="h-10 flex-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBatch}
                  className="h-10 flex-1 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-xs font-black text-zinc-950 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Asignar Reserva a Mesa #{assigningTable.table_number}</h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Capacidad: {assigningTable.capacity} personas · Zona: {assigningTable.zone || 'Salón'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTable(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full transition-colors"
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
                    className="flex flex-col gap-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3 sm:flex-row sm:items-center sm:justify-between shadow-2xs"
                  >
                    <div>
                      <p className="font-black text-xs text-zinc-900 dark:text-zinc-100">{res.customer_name}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {res.guests} personas · Tel: {res.customer_phone}
                      </p>
                      <p className="text-[11px] font-mono font-bold text-[#EAA228]">
                        Hora: {new Date(res.date_time).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {res.notes && <p className="text-[10px] italic text-zinc-400">Nota: {res.notes}</p>}
                    </div>

                    <button
                      type="button"
                      disabled={isAssigning || exceedsCapacity}
                      onClick={() => void handleAssignReservation(res.id)}
                      className={`h-8 rounded-full px-3.5 text-xs font-black shadow-2xs transition-all cursor-pointer ${
                        exceedsCapacity
                          ? 'bg-zinc-100 text-zinc-400 opacity-50 cursor-not-allowed'
                          : 'bg-[#EAA228] hover:bg-[#D99318] text-zinc-950 active:scale-[0.98]'
                      }`}
                      title={exceedsCapacity ? 'Excede la capacidad de la mesa' : 'Asignar'}
                    >
                      {exceedsCapacity ? 'Excede Cupo' : 'Asignar'}
                    </button>
                  </div>
                );
              })}

              {!unassignedReservations.length && (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No hay reservas pendientes sin mesa asignada para hoy.
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setAssigningTable(null)}
                className="h-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 shadow-2xs cursor-pointer"
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

      {/* Modal de Compartir Carta Digital por WhatsApp */}
      {showShareMenuModal && (
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
                onClick={() => setShowShareMenuModal(false)}
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
                  value={whatsappPhoneInput}
                  onChange={(e) => setWhatsappPhoneInput(e.target.value)}
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
                    const clean = whatsappPhoneInput.replace(/\D/g, '');
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
                    setIsCopiedMenuLink(true);
                    setTimeout(() => setIsCopiedMenuLink(false), 2000);
                  }}
                  className="h-11 px-4 rounded-xl border border-[#EAE5DE] bg-[#FAF7F2] hover:bg-[#EAE5DE] text-xs font-bold text-[#181C20] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isCopiedMenuLink ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopiedMenuLink ? 'Copiado' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Genérico Suave (sin alert de navegador) */}
      {confirmModalData && (
        <ConfirmModal
          isOpen={confirmModalData.isOpen}
          title={confirmModalData.title}
          description={confirmModalData.description}
          confirmText={confirmModalData.confirmText}
          variant={confirmModalData.variant}
          onConfirm={confirmModalData.onConfirm}
          onClose={() => setConfirmModalData(null)}
        />
      )}
    </div>
  );
}
