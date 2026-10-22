'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  Bell,
  BellOff,
  Clock,
  Flame,
  Check,
  CheckCheck,
  RefreshCw,
  Search,
  Maximize2,
  Minimize2,
  Grid3X3,
  Columns3,
  RotateCcw,
  UtensilsCrossed,
  ChefHat,
  PackageCheck,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';

export type KdsItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  notes: string | null;
  status: 'pendiente' | 'preparando' | 'listo' | 'entregado';
  station: 'cocina' | 'barra';
  statusChangedAt: string;
};

export type KdsOrder = {
  id: string;
  orderNumber: number;
  tableNumber: number;
  zone: string | null;
  openedAt: string;
  closedAt: string | null;
  status: string;
  items: KdsItem[];
};

type OrderStage = 'nuevo' | 'preparando' | 'listo' | 'entregado';

function playKitchenChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(2640, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.2);
    osc2.stop(ctx.currentTime + 1.2);
  } catch {
    // Autoplay fallback
  }
}

export function KdsBoard({
  restaurantId,
  userRole = 'kitchen',
}: {
  restaurantId: string;
  userRole?: string;
}) {
  const isCook = ['kitchen', 'host', 'admin', 'owner', 'cashier'].includes(userRole);
  const [collapseAll, setCollapseAll] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Datos
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [kitchenStaffName, setKitchenStaffName] = useState<string>('Chef Ejecutivo');

  // Cargar nombre del personal de cocina asignado
  useEffect(() => {
    async function loadKitchenStaff() {
      try {
        const res = await fetch('/api/staff');
        if (res.ok) {
          const body = (await res.json()) as { staff?: Array<{ role: string; fullName: string; active: boolean }> };
          const cooks = (body.staff || []).filter((s) => s.role === 'kitchen' && s.active);
          if (cooks.length > 0) {
            setKitchenStaffName(cooks.map((c) => c.fullName).join(', '));
          }
        }
      } catch {
        // Fallback default
      }
    }
    void loadKitchenStaff();
  }, []);

  // Controles de Visualización
  const [activeTab, setActiveTab] = useState<'activos' | 'finalizados'>('activos');
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  const [stationFilter, setStationFilter] = useState<'todas' | 'cocina' | 'barra'>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const previousReadyIdsRef = useRef<Set<string>>(new Set());
  const [readyToast, setReadyToast] = useState<{ id: string; tableNumber: number; orderNumber: number; count: number } | null>(null);

  // Ticker de tiempo cada 5 segundos
  useEffect(() => {
    const immediate = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => {
      window.clearTimeout(immediate);
      clearInterval(timer);
    };
  }, []);

  // Pantalla Completa Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Carga de Comandas (Activas y Recientes)
  const loadKdsData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsRefreshing(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = today.toISOString();

      // Consultamos órdenes de hoy (abiertas, pagadas, en_espera) con left join en tables
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          opened_at,
          closed_at,
          status,
          tables (
            table_number,
            zone
          ),
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            notes,
            status,
            created_at,
            station,
            products (
              station
            )
          )
        `)
        .eq('restaurant_id', restaurantId)
        .in('status', ['abierta', 'pagada', 'en_espera'])
        .gte('opened_at', startOfDay)
        .order('opened_at', { ascending: true });

      if (!isSilent) setIsRefreshing(false);

      if (error) {
        console.error('[KDS] Error al consultar comandas:', error);
      }

      if (error || !data) return;

      type RawTable = { table_number: number; zone: string | null } | null;
      type RawItem = {
        id: string;
        product_id: string;
        product_name: string;
        quantity: number;
        notes: string | null;
        status: string;
        created_at: string;
        station?: string | null;
        products: { station: string } | Array<{ station: string }> | null;
      };

      const mapped: KdsOrder[] = data.map((raw) => {
        const table = Array.isArray(raw.tables) ? raw.tables[0] : (raw.tables as RawTable);
        const rawItems = (raw.order_items || []) as unknown as RawItem[];

        const items: KdsItem[] = rawItems.map((it) => {
          const product = Array.isArray(it.products) ? it.products[0] : it.products;
          const resolvedStation = (it.station || product?.station || 'cocina') as 'cocina' | 'barra';

          return {
            id: it.id,
            productId: it.product_id,
            productName: it.product_name,
            quantity: it.quantity,
            notes: it.notes,
            status: (it.status || 'pendiente') as KdsItem['status'],
            station: resolvedStation,
            statusChangedAt: it.created_at,
          };
        });

        return {
          id: raw.id,
          orderNumber: raw.order_number,
          tableNumber: table?.table_number ?? 0,
          zone: table?.zone ?? null,
          openedAt: raw.opened_at,
          closedAt: raw.closed_at ?? null,
          status: raw.status,
          items,
        };
      });

      // Detección de nuevas órdenes para sonido y flash
      const activeMapped = mapped.filter((o) => o.items.some((it) => it.status !== 'entregado'));
      const currentIds = new Set(activeMapped.map((o) => o.id));

      if (previousOrderIdsRef.current.size > 0) {
        const incoming = activeMapped.filter((o) => !previousOrderIdsRef.current.has(o.id));
        if (incoming.length > 0) {
          if (soundEnabled) playKitchenChime();
          setNewOrderIds(new Set(incoming.map((o) => o.id)));
          setTimeout(() => setNewOrderIds(new Set()), 3500);
        }
      }
      previousOrderIdsRef.current = currentIds;

      // Detección de órdenes listas para despacho (notificación al cajero/mesero)
      const readyOrders = activeMapped.filter((o) => o.items.length > 0 && o.items.every((it) => it.status === 'listo'));
      const currentReadyIds = new Set(readyOrders.map((o) => o.id));

      if (previousReadyIdsRef.current.size > 0) {
        const newlyReady = readyOrders.filter((o) => !previousReadyIdsRef.current.has(o.id));
        if (newlyReady.length > 0) {
          if (soundEnabled) playKitchenChime();
          const first = newlyReady[0];
          setReadyToast({
            id: first.id,
            tableNumber: first.tableNumber,
            orderNumber: first.orderNumber,
            count: first.items.length,
          });
          setTimeout(() => setReadyToast(null), 8000);
        }
      }
      previousReadyIdsRef.current = currentReadyIds;

      setOrders(mapped);
    },
    [restaurantId, supabase, soundEnabled]
  );

  // Subscripción Realtime
  useEffect(() => {
    const timer = window.setTimeout(() => void loadKdsData(), 0);

    const channel = supabase
      .channel(`kds-orders-v2-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `restaurant_id=eq.${restaurantId}` },
        () => void loadKdsData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => void loadKdsData(true)
      )
      .subscribe();

    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase, loadKdsData]);

  // Avanzar todos los ítems de una orden
  const advanceOrderStage = async (order: KdsOrder, targetStatus: 'preparando' | 'listo' | 'entregado') => {
    let targetItems = order.items;
    if (targetStatus === 'preparando') {
      targetItems = order.items.filter((it) => it.status === 'pendiente');
    } else if (targetStatus === 'listo') {
      targetItems = order.items.filter((it) => it.status === 'pendiente' || it.status === 'preparando');
    } else if (targetStatus === 'entregado') {
      targetItems = order.items.filter((it) => it.status === 'listo' || it.status === 'preparando' || it.status === 'pendiente');
    }

    const itemIds = targetItems.map((it) => it.id);
    if (!itemIds.length) return;

    try {
      await fetch('/api/kds/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, status: targetStatus, nextStatus: targetStatus }),
      });
      await loadKdsData(true);
    } catch {
      // Reintentar en siguiente sync
    }
  };

  // Reabrir / Deshacer una orden finalizada y devolverla a la cocina
  const reopenDeliveredOrder = async (order: KdsOrder) => {
    const itemIds = order.items.map((it) => it.id);
    if (!itemIds.length) return;

    try {
      await fetch('/api/kds/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, status: 'listo', nextStatus: 'listo' }),
      });
      await loadKdsData(true);
    } catch {
      // Reintentar
    }
  };

  // Avanzar un ítem individual
  const advanceSingleItem = async (itemId: string, currentStatus: KdsItem['status']) => {
    let nextStatus: KdsItem['status'] = 'preparando';
    if (currentStatus === 'pendiente') nextStatus = 'preparando';
    else if (currentStatus === 'preparando') nextStatus = 'listo';
    else if (currentStatus === 'listo') nextStatus = 'entregado';
    else if (currentStatus === 'entregado') nextStatus = 'listo'; // Permite deshacer
    else return;

    try {
      await fetch('/api/kds/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [itemId], status: nextStatus, nextStatus }),
      });
      await loadKdsData(true);
    } catch {
      // Silenciar
    }
  };

  // Filtrado por estación y búsqueda
  const filteredOrders = useMemo(() => {
    return orders
      .map((ord) => {
        let items = ord.items;
        if (stationFilter !== 'todas') {
          items = items.filter((it) => it.station === stationFilter);
        }
        return { ...ord, items };
      })
      .filter((ord) => {
        if (!ord.items.length) return false;
        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase().trim();
        const matchesNum = ord.orderNumber.toString().includes(q);
        const matchesTable = ord.tableNumber.toString().includes(q) || `mesa ${ord.tableNumber}`.includes(q);
        const matchesDish = ord.items.some((it) => it.productName.toLowerCase().includes(q));
        const matchesZone = ord.zone ? ord.zone.toLowerCase().includes(q) : false;

        return matchesNum || matchesTable || matchesDish || matchesZone;
      });
  }, [orders, stationFilter, searchQuery]);

  // División en Activos vs Finalizados
  const activeOrders = useMemo(() => {
    return filteredOrders.filter((ord) => ord.items.some((it) => it.status !== 'entregado'));
  }, [filteredOrders]);

  const completedOrders = useMemo(() => {
    return filteredOrders
      .filter((ord) => ord.items.every((it) => it.status === 'entregado'))
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }, [filteredOrders]);

  // KPIs de la Cocina en Tiempo Real
  const kpiStats = useMemo(() => {
    let pendingCount = 0;
    let cookingCount = 0;
    let readyCount = 0;
    let totalWaitMinutes = 0;

    for (const ord of activeOrders) {
      const wait = currentTime > 0 ? Math.max(0, Math.floor((currentTime - new Date(ord.openedAt).getTime()) / 60000)) : 0;
      totalWaitMinutes += wait;

      for (const it of ord.items) {
        if (it.status === 'pendiente') pendingCount += it.quantity;
        else if (it.status === 'preparando') cookingCount += it.quantity;
        else if (it.status === 'listo') readyCount += it.quantity;
      }
    }

    const avgWait = activeOrders.length > 0 ? Math.round(totalWaitMinutes / activeOrders.length) : 0;

    return {
      activeTickets: activeOrders.length,
      pendingCount,
      cookingCount,
      readyCount,
      avgWait,
      completedTickets: completedOrders.length,
    };
  }, [activeOrders, completedOrders, currentTime]);

  // Clasificación en Columnas Kanban
  const columns = useMemo(() => {
    const nuevo: KdsOrder[] = [];
    const preparando: KdsOrder[] = [];
    const listo: KdsOrder[] = [];

    for (const ord of activeOrders) {
      const activeItems = ord.items.filter((it) => it.status !== 'entregado');
      if (!activeItems.length) continue;

      const hasPending = activeItems.some((it) => it.status === 'pendiente');
      const hasPreparing = activeItems.some((it) => it.status === 'preparando');
      const allReady = activeItems.every((it) => it.status === 'listo');

      if (hasPending && !hasPreparing) {
        nuevo.push(ord);
      } else if (hasPreparing || hasPending) {
        preparando.push(ord);
      } else if (allReady) {
        listo.push(ord);
      }
    }

    return { nuevo, preparando, listo };
  }, [activeOrders]);

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Flotante cuando una Orden está Lista para Despachar */}
      {readyToast && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl border-2 border-emerald-500 bg-white p-4 shadow-xl flex items-start gap-3 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black shadow-xs">
            <CheckCheck className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">
              ¡Orden Lista para Despachar!
            </h4>
            <p className="mt-0.5 text-sm font-extrabold text-zinc-900">
              Mesa #{readyToast.tableNumber} · Orden #{readyToast.orderNumber}
            </p>
            <p className="text-[11px] text-zinc-500">
              {readyToast.count} {readyToast.count === 1 ? 'platillo preparado' : 'platillos preparados'} esperando retiro en cocina.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReadyToast(null)}
            className="text-zinc-400 hover:text-zinc-600 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header Principal y Barra de Herramientas de Cocina (Tema Claro y Dorado) */}
      <header className="rounded-3xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Logo y Título */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f3a806]/15 border border-[#f3a806]/30 text-[#f3a806] shadow-2xs">
              <ChefHat className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-[#f3a806]">
                  KDS Cocina & Barra · En Vivo
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
                Comandero de Cocina
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Cocinero en Turno: {kitchenStaffName}</span>
                </div>
                {userRole !== 'kitchen' && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                    <span>Supervisión Operativa ({userRole})</span>
                  </div>
                )}
                <span className="text-[11px] font-medium text-zinc-500">
                  · Pantalla Operativa de Cocina
                </span>
              </div>
            </div>
          </div>

          {/* Selector de Pestañas: Activos vs Finalizados */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 p-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('activos')}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black transition-all cursor-pointer ${
                activeTab === 'activos'
                  ? 'bg-[#f3a806] text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Zap className="h-4 w-4 stroke-[2.5]" />
              <span>En Marcha</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${activeTab === 'activos' ? 'bg-zinc-950 text-[#f3a806]' : 'bg-zinc-200 text-zinc-700'}`}>
                {kpiStats.activeTickets}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('finalizados')}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black transition-all cursor-pointer ${
                activeTab === 'finalizados'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <PackageCheck className="h-4 w-4 stroke-[2.5]" />
              <span>Finalizados / Entregados</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${activeTab === 'finalizados' ? 'bg-white text-emerald-800' : 'bg-zinc-200 text-zinc-700'}`}>
                {kpiStats.completedTickets}
              </span>
            </button>
          </div>

          {/* Controles: Estaciones, Sonido, Vista, Fullscreen */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Estación */}
            <div className="inline-flex rounded-full bg-zinc-100 border border-zinc-200 p-1">
              {(['todas', 'cocina', 'barra'] as const).map((station) => (
                <button
                  key={station}
                  type="button"
                  onClick={() => setStationFilter(station)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition-colors cursor-pointer ${
                    stationFilter === station
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {station}
                </button>
              ))}
            </div>

            {/* Alternador de Vista (Kanban vs Cuadrícula) */}
            {activeTab === 'activos' && (
              <div className="inline-flex rounded-full bg-zinc-100 border border-zinc-200 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  title="Vista Columnas Kanban"
                  className={`rounded-full p-2 text-xs transition-colors cursor-pointer ${
                    viewMode === 'kanban' ? 'bg-white text-[#f3a806] shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Columns3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista Cuadrícula Compacta (Muchos Pedidos)"
                  className={`rounded-full p-2 text-xs transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-[#f3a806] shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Alternador Global de Detalle (Expandir / Compactar Todo) */}
            <button
              type="button"
              onClick={() => setCollapseAll((prev) => !prev)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer shadow-2xs"
              title={collapseAll ? 'Expandir detalle de todas las órdenes' : 'Compactar todas las órdenes'}
            >
              <ChevronsUpDown className="h-3.5 w-3.5 text-[#f3a806]" />
              <span className="hidden sm:inline">{collapseAll ? 'Expandir Todo' : 'Compactar Todo'}</span>
            </button>

            {/* Sonido */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors cursor-pointer ${
                soundEnabled
                  ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 shadow-2xs'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-400'
              }`}
              title={soundEnabled ? 'Silenciar campanilla' : 'Activar campanilla'}
            >
              {soundEnabled ? (
                <>
                  <Bell className="h-3.5 w-3.5 text-[#f3a806]" />
                  <span className="hidden sm:inline">Sonido</span>
                </>
              ) : (
                <>
                  <BellOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mudo</span>
                </>
              )}
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer shadow-2xs"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa de cocina'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Recargar */}
            <button
              type="button"
              onClick={() => void loadKdsData()}
              disabled={isRefreshing}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Refrescar comanda"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-[#f3a806]' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. Barra de KPIs y Buscador en una sola fila integrada */}
        <div className="pt-4 border-t border-zinc-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Métricas / Conteo de Platos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 flex items-center justify-between shadow-2xs">
              <span className="text-[11px] font-bold text-zinc-600">⏳ Por Iniciar</span>
              <span className="text-base font-black text-amber-700">{kpiStats.pendingCount}</span>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-2.5 flex items-center justify-between shadow-2xs">
              <span className="text-[11px] font-bold text-amber-900">🔥 En Fuego</span>
              <span className="text-base font-black text-[#f3a806]">{kpiStats.cookingCount}</span>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 flex items-center justify-between shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-900">🛎️ Listos</span>
              <span className="text-base font-black text-emerald-700">{kpiStats.readyCount}</span>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-2.5 flex items-center justify-between shadow-2xs">
              <span className="text-[11px] font-bold text-zinc-600">⏱️ Espera Prom.</span>
              <span className={`text-base font-black ${kpiStats.avgWait > 15 ? 'text-rose-600' : 'text-zinc-800'}`}>
                {kpiStats.avgWait}m
              </span>
            </div>
          </div>

          {/* Buscador Rápido de Comandas */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar mesa, # orden o plato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-50/80 pl-9 pr-8 text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-[#f3a806] focus:outline-none transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. Vistas de Contenido */}

      {/* PESTAÑA A: COMANDAS ACTIVAS (EN MARCHA) */}
      {activeTab === 'activos' && (
        <>
          {activeOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-16 text-center shadow-xs">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400">
                <UtensilsCrossed className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-black text-zinc-900">Cocina libre de pedidos activos</h2>
              <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">
                No hay órdenes pendientes de preparación en este momento. Cuando se tome un pedido en salón o en caja, aparecerá aquí con aviso en tiempo real.
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50"
                >
                  Limpiar filtro de búsqueda &quot;{searchQuery}&quot;
                </button>
              )}
            </div>
          ) : viewMode === 'kanban' ? (
            /* VISTA KANBAN (3 COLUMNAS: NUEVO, PREPARANDO, LISTO) */
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Columna 1: Por Iniciar / Nuevo */}
              <section className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-amber-950">
                      Por Iniciar (Nuevos)
                    </h2>
                  </div>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-200/60 px-2 text-xs font-black text-amber-950">
                    {columns.nuevo.length}
                  </span>
                </div>

                {columns.nuevo.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-2xs">
                    <p className="text-xs text-zinc-400">Sin órdenes en espera</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[calc(100vh-270px)] min-h-[460px] overflow-y-auto pr-1.5 pb-8 overscroll-contain kds-scrollbar">
                    {columns.nuevo.map((ord) => (
                      <KdsTicketCard
                        key={ord.id}
                        order={ord}
                        currentTime={currentTime}
                        stage="nuevo"
                        isFlashing={newOrderIds.has(ord.id)}
                        canAction={isCook}
                        collapseAll={collapseAll}
                        onAdvance={() => void advanceOrderStage(ord, 'preparando')}
                        onAdvanceItem={(id, st) => void advanceSingleItem(id, st)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Columna 2: En Preparación / En Fuego */}
              <section className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-orange-200/80 bg-orange-50/70 px-4 py-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-600" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-orange-950">
                      En Preparación (En Fuego)
                    </h2>
                  </div>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f3a806] px-2 text-xs font-black text-zinc-950">
                    {columns.preparando.length}
                  </span>
                </div>

                {columns.preparando.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-2xs">
                    <p className="text-xs text-zinc-400">Ningún plato en fuego actualmente</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[calc(100vh-270px)] min-h-[460px] overflow-y-auto pr-1.5 pb-8 overscroll-contain kds-scrollbar">
                    {columns.preparando.map((ord) => (
                      <KdsTicketCard
                        key={ord.id}
                        order={ord}
                        currentTime={currentTime}
                        stage="preparando"
                        isFlashing={newOrderIds.has(ord.id)}
                        canAction={isCook}
                        collapseAll={collapseAll}
                        onAdvance={() => void advanceOrderStage(ord, 'listo')}
                        onAdvanceItem={(id, st) => void advanceSingleItem(id, st)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Columna 3: Listos para Despacho */}
              <section className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                      Listos para Entrega
                    </h2>
                  </div>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-2 text-xs font-black text-white">
                    {columns.listo.length}
                  </span>
                </div>

                {columns.listo.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-2xs">
                    <p className="text-xs text-zinc-400">Sin platos listos esperando despacho</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[calc(100vh-270px)] min-h-[460px] overflow-y-auto pr-1.5 pb-8 overscroll-contain kds-scrollbar">
                    {columns.listo.map((ord) => (
                      <KdsTicketCard
                        key={ord.id}
                        order={ord}
                        currentTime={currentTime}
                        stage="listo"
                        isFlashing={newOrderIds.has(ord.id)}
                        canAction={isCook}
                        collapseAll={collapseAll}
                        onAdvance={() => void advanceOrderStage(ord, 'entregado')}
                        onAdvanceItem={(id, st) => void advanceSingleItem(id, st)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            /* VISTA CUADRÍCULA COMPACTA (MULTITASKING PARA MUCHOS PEDIDOS) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1.5 pb-8 kds-scrollbar">
              {activeOrders.map((ord) => {
                const activeItems = ord.items.filter((it) => it.status !== 'entregado');
                const hasPending = activeItems.some((it) => it.status === 'pendiente');
                const hasPreparing = activeItems.some((it) => it.status === 'preparando');
                const allReady = activeItems.every((it) => it.status === 'listo');

                let currentStage: OrderStage = 'nuevo';
                if (allReady) currentStage = 'listo';
                else if (hasPreparing || hasPending) currentStage = 'preparando';

                return (
                  <KdsTicketCard
                    key={ord.id}
                    order={ord}
                    currentTime={currentTime}
                    stage={currentStage}
                    isFlashing={newOrderIds.has(ord.id)}
                    canAction={isCook}
                    collapseAll={collapseAll}
                    onAdvance={() => {
                      if (currentStage === 'nuevo') void advanceOrderStage(ord, 'preparando');
                      else if (currentStage === 'preparando') void advanceOrderStage(ord, 'listo');
                      else void advanceOrderStage(ord, 'entregado');
                    }}
                    onAdvanceItem={(id, st) => void advanceSingleItem(id, st)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* PESTAÑA B: APARTADO DE FINALIZADOS O YA ENTREGADOS */}
      {activeTab === 'finalizados' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
            <div>
              <h2 className="text-base font-black text-zinc-900 flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-emerald-600" />
                Historial de Órdenes Entregadas ({completedOrders.length})
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Platos y pedidos despachados durante el turno de hoy. Si marcaste un pedido como entregado por error, puedes pulsar &quot;Reabrir a Cocina&quot; para recuperarlo inmediatamente.
              </p>
            </div>
          </div>

          {completedOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-xs">
              <p className="text-zinc-400 text-xs font-medium">Aún no se han despachado pedidos finalizados hoy.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Cabecera */}
                    <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          {ord.zone || 'Salón'} · {ord.status === 'pagada' ? 'Pagado' : 'Salón'}
                        </span>
                        <h3 className="text-xl font-black text-zinc-900">
                          Mesa #{ord.tableNumber}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-2xl font-black text-zinc-800">
                          #{ord.orderNumber}
                        </span>
                        <span className="block text-[10px] text-zinc-400 font-medium">
                          {new Date(ord.openedAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Lista de Platos Entregados */}
                    <ul className="divide-y divide-zinc-100 py-3 space-y-2">
                      {ord.items.map((it) => (
                        <li key={it.id} className="pt-2 flex items-center justify-between text-xs">
                          <span className="text-zinc-700 font-semibold flex items-center gap-2">
                            <span className="font-bold font-mono text-emerald-600">{it.quantity}×</span>
                            <span className="line-through text-zinc-400">{it.productName}</span>
                          </span>
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Entregado
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botón Reabrir (solo para Cocinero) */}
                  <div className="pt-2 border-t border-zinc-100">
                    {isCook ? (
                      <button
                        type="button"
                        onClick={() => void reopenDeliveredOrder(ord)}
                        className="h-10 w-full rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                        <span>Reabrir a Cocina</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between px-2 py-1 text-xs">
                        <span className="text-[11px] font-medium text-zinc-400">Despacho completado</span>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                          ✓ Entregado
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// Subcomponente de Tarjeta de Comanda (Tema Claro & Dorado con Plegado y Scroll Interno)
function KdsTicketCard({
  order,
  currentTime,
  stage,
  isFlashing,
  canAction = true,
  collapseAll = false,
  onAdvance,
  onAdvanceItem,
}: {
  order: KdsOrder;
  currentTime: number;
  stage: OrderStage;
  isFlashing: boolean;
  canAction?: boolean;
  collapseAll?: boolean;
  onAdvance: () => void;
  onAdvanceItem: (itemId: string, currentStatus: KdsItem['status']) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(!collapseAll);

  useEffect(() => {
    setIsExpanded(!collapseAll);
  }, [collapseAll]);

  const minutesElapsed =
    currentTime > 0
      ? Math.max(0, Math.floor((currentTime - new Date(order.openedAt).getTime()) / 60000))
      : 0;

  // Estados visuales de demora acordes a la paleta del sistema
  let borderClass = 'border-zinc-200 hover:border-zinc-300';
  let waitStatusText = `${minutesElapsed} min · A tiempo`;
  let timeBadgeColor = 'text-zinc-600 bg-zinc-100 border-zinc-200';

  if (minutesElapsed >= 20) {
    borderClass = 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/30';
    waitStatusText = `${minutesElapsed} min · Demora crítica`;
    timeBadgeColor = 'text-rose-700 bg-rose-50 border-rose-300 font-black animate-pulse';
  } else if (minutesElapsed >= 10) {
    borderClass = 'border-amber-300 ring-2 ring-amber-300/25 bg-amber-50/20';
    waitStatusText = `${minutesElapsed} min · En espera`;
    timeBadgeColor = 'text-amber-800 bg-amber-50 border-amber-200 font-bold';
  }

  let actionLabel = 'Marchar a Cocina';
  let actionIcon = Flame;
  let actionBg = 'bg-[#f3a806] hover:bg-[#e09804] text-zinc-950';

  if (stage === 'preparando') {
    actionLabel = 'Marcar Todo Listo';
    actionIcon = Check;
    actionBg = 'bg-[#f3a806] hover:bg-[#e09804] text-zinc-950';
  } else if (stage === 'listo') {
    actionLabel = 'Despachar al Mesero';
    actionIcon = CheckCheck;
    actionBg = 'bg-emerald-600 hover:bg-emerald-700 text-white';
  }

  const ActionIcon = actionIcon;
  const totalItemsCount = order.items.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <article
      className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md ${borderClass} ${
        isFlashing ? 'ring-4 ring-[#f3a806] scale-[1.01]' : ''
      }`}
    >
      <div>
        {/* Cabecera del Ticket */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {order.zone || 'Salón'}
              </span>
              {order.status === 'pagada' && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[9px] font-bold text-emerald-800">
                  Pre-pagado
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black text-zinc-900 leading-tight mt-0.5">
              Mesa #{order.tableNumber}
            </h3>
          </div>

          <div className="text-right">
            <span className="text-3xl font-black leading-none text-zinc-900 font-mono tracking-tight block">
              #{order.orderNumber}
            </span>
            <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${timeBadgeColor}`}>
              <Clock className="h-3 w-3 shrink-0" />
              <span>{waitStatusText}</span>
            </div>
          </div>
        </div>

        {/* Botón Plegar / Desplegar Detalle */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-3 flex items-center justify-between w-full rounded-2xl bg-zinc-50 hover:bg-zinc-100/90 border border-zinc-200/80 px-3 py-2 text-xs font-bold text-zinc-700 transition-colors cursor-pointer shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#f3a806]" />
            <span>{isExpanded ? 'Ocultar Detalle' : 'Ver Detalle'}</span>
            <span className="text-[11px] font-semibold text-zinc-500">
              ({totalItemsCount} {totalItemsCount === 1 ? 'plato' : 'platos'})
            </span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-semibold">
            <span>{isExpanded ? 'Plegar' : 'Desplegar'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {/* Vista Compacta (cuando está plegado para que se haga pequeño) */}
        {!isExpanded && (
          <p className="mt-2 text-[11px] text-zinc-500 font-medium truncate px-1">
            {order.items.map((it) => `${it.quantity}× ${it.productName}`).join(' · ')}
          </p>
        )}

        {/* Vista Detallada con Scroll Interno (para que no se vaya hasta abajo la pantalla) */}
        {isExpanded && (
          <div className="mt-3 max-h-52 overflow-y-auto pr-1 kds-scrollbar">
            <ul className="divide-y divide-zinc-100 space-y-2.5">
              {order.items.map((it) => {
                const isReady = it.status === 'listo';
                const isCooking = it.status === 'preparando';
                const isPending = it.status === 'pendiente';
                const isDelivered = it.status === 'entregado';

                return (
                  <li key={it.id} className="pt-2.5 first:pt-0">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-baseline gap-2.5 flex-1 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/25 text-sm font-black text-[#f3a806]">
                          {it.quantity}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span
                            className={`text-sm font-extrabold leading-snug block transition-opacity ${
                              isReady ? 'text-emerald-700 line-through opacity-80' : 'text-zinc-900'
                            }`}
                          >
                            {it.productName}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            {it.station === 'barra' ? '🥤 Barra' : '🍳 Cocina'}
                          </span>
                        </div>
                      </div>

                      {/* Estado del ítem */}
                      <div className="shrink-0">
                        {isPending && (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            ⏳ Espera
                          </span>
                        )}
                        {isCooking && (
                          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-black text-orange-800">
                            🔥 Cocinando
                          </span>
                        )}
                        {isReady && (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                            ✅ Listo
                          </span>
                        )}
                        {isDelivered && (
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                            ✓ Despachado
                          </span>
                        )}
                      </div>
                    </div>

                    {it.notes && (
                      <div className="mt-1.5 ml-9 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                        ⚠️ Nota: {it.notes}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Botón de Acción Principal para Avanzar la Orden */}
      <div className="mt-3.5 pt-3 border-t border-zinc-100">
        {canAction ? (
          <button
            type="button"
            onClick={onAdvance}
            className={`h-11 w-full rounded-full text-xs font-black tracking-wide transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-xs ${actionBg}`}
          >
            <ActionIcon className="h-4 w-4 stroke-[2.8]" />
            <span>{actionLabel}</span>
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-2xl bg-zinc-50 border border-zinc-200/80 px-4 py-2">
            <span className="text-[11px] font-bold text-zinc-500 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              Estado en cocina:
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                stage === 'nuevo'
                  ? 'bg-amber-100/80 text-amber-900 border border-amber-200'
                  : stage === 'preparando'
                  ? 'bg-orange-100/80 text-orange-950 border border-orange-200'
                  : 'bg-emerald-100/80 text-emerald-950 border border-emerald-200'
              }`}
            >
              {stage === 'nuevo'
                ? '⏳ En Cola de Espera'
                : stage === 'preparando'
                ? '🔥 En Preparación'
                : '✅ Listo para Despachar'}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
