'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type KdsItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  notes: string | null;
  status: 'pendiente' | 'preparando' | 'listo' | 'entregado';
  station: 'cocina' | 'barra';
  statusChangedAt: string;
};

type KdsOrder = {
  id: string;
  orderNumber: number;
  tableNumber: number;
  zone: string | null;
  openedAt: string;
  status: string;
  items: KdsItem[];
};

type StationFilter = 'todas' | 'cocina' | 'barra';
type StatusView = 'activas' | 'listas' | 'todas';

// Función para sintetizar sonido de campana de cocina (Web Audio API)
function playKitchenChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // La5
    osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime); // Mi6
    osc2.frequency.exponentialRampToValueAtTime(2640, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.2);
    osc2.stop(ctx.currentTime + 1.2);
  } catch {
    // Si el navegador bloquea autoplay hasta el primer click
  }
}

export function KdsBoard({ restaurantId }: { restaurantId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [stationFilter, setStationFilter] = useState<StationFilter>('todas');
  const [statusView, setStatusView] = useState<StatusView>('activas');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Registro de órdenes conocidas para detectar nuevas y sonar alerta
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  // Actualizar el cronómetro cada 10 segundos
  useEffect(() => {
    const immediate = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => {
      window.clearTimeout(immediate);
      clearInterval(timer);
    };
  }, []);

  const loadKdsData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsRefreshing(true);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          opened_at,
          status,
          tables!inner (
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
            station,
            status_changed_at
          )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('status', 'abierta')
        .order('opened_at', { ascending: true });

      if (!isSilent) setIsRefreshing(false);

      if (error || !data) return;

      type RawTable = { table_number: number; zone: string | null };
      type RawItem = {
        id: string;
        product_id: string;
        product_name: string;
        quantity: number;
        notes: string | null;
        status: 'pendiente' | 'preparando' | 'listo' | 'entregado';
        station: 'cocina' | 'barra';
        status_changed_at: string;
      };

      const formatted: KdsOrder[] = data.map((ord) => {
        const table = (ord.tables as unknown) as RawTable;
        const items = ((ord.order_items as unknown) as RawItem[]) || [];

        return {
          id: ord.id,
          orderNumber: ord.order_number,
          tableNumber: table.table_number,
          zone: table.zone,
          openedAt: ord.opened_at,
          status: ord.status,
          items: items.map((it) => ({
            id: it.id,
            productId: it.product_id,
            productName: it.product_name,
            quantity: it.quantity,
            notes: it.notes,
            status: it.status,
            station: it.station || 'cocina',
            statusChangedAt: it.status_changed_at || ord.opened_at,
          })),
        };
      });

      // Detectar si entró comanda nueva
      if (previousOrderIdsRef.current.size > 0 && soundEnabled) {
        const hasNewOrder = formatted.some((o) => !previousOrderIdsRef.current.has(o.id));
        if (hasNewOrder) {
          playKitchenChime();
        }
      }

      previousOrderIdsRef.current = new Set(formatted.map((o) => o.id));
      setOrders(formatted);
    },
    [restaurantId, soundEnabled, supabase],
  );

  // Subscripción en tiempo real y polling de respaldo
  useEffect(() => {
    const timer = window.setTimeout(() => void loadKdsData(), 0);

    const channel = supabase
      .channel(`realtime-kds-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `restaurant_id=eq.${restaurantId}` },
        () => void loadKdsData(true),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => void loadKdsData(true),
      )
      .subscribe();

    const interval = setInterval(() => {
      void loadKdsData(true);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [loadKdsData, restaurantId, supabase]);

  // Actualizar estado de items
  const updateItemStatus = async (itemIds: string[], nextStatus: KdsItem['status']) => {
    // Actualización optimista local
    setOrders((currentOrders) =>
      currentOrders.map((ord) => ({
        ...ord,
        items: ord.items.map((it) => (itemIds.includes(it.id) ? { ...it, status: nextStatus } : it)),
      })),
    );

    const res = await fetch('/api/kds/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds, status: nextStatus }),
    });

    if (!res.ok) {
      void loadKdsData(true);
    }
  };

  // Filtrado de órdenes e ítems
  const visibleOrders = useMemo(() => {
    return orders
      .map((ord) => {
        // 1. Filtrar por estación
        const stationItems =
          stationFilter === 'todas' ? ord.items : ord.items.filter((it) => it.station === stationFilter);

        return { ...ord, items: stationItems };
      })
      .filter((ord) => {
        if (!ord.items.length) return false;

        // 2. Filtrar por estado de vista
        const hasPendingOrPreparing = ord.items.some((it) => ['pendiente', 'preparando'].includes(it.status));
        const allReady = ord.items.every((it) => ['listo', 'entregado'].includes(it.status));

        if (statusView === 'activas') return hasPendingOrPreparing;
        if (statusView === 'listas') return allReady;
        return true;
      });
  }, [orders, stationFilter, statusView]);

  return (
    <div className="space-y-5">
      {/* Barra de Controles del KDS */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Estación */}
          <div className="inline-flex rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStationFilter('todas')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                stationFilter === 'todas' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
              }`}
            >
              Todo Salón
            </button>
            <button
              type="button"
              onClick={() => setStationFilter('cocina')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                stationFilter === 'cocina' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              🍳 Cocina
            </button>
            <button
              type="button"
              onClick={() => setStationFilter('barra')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                stationFilter === 'barra' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              🍹 Barra
            </button>
          </div>

          {/* Filtro por Vista */}
          <div className="inline-flex rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusView('activas')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                statusView === 'activas' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
              }`}
            >
              Por Preparar ({orders.filter((o) => o.items.some((i) => ['pendiente', 'preparando'].includes(i.status))).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusView('listas')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                statusView === 'listas' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
              }`}
            >
              Listos ({orders.filter((o) => o.items.every((i) => ['listo', 'entregado'].includes(i.status))).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusView('todas')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                statusView === 'todas' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
              }`}
            >
              Todas ({orders.length})
            </button>
          </div>
        </div>

        {/* Acciones y Conexión en Vivo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              soundEnabled ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
            title="Activar o desactivar sonido de comanda"
          >
            <span>{soundEnabled ? '🔔 Alerta ON' : '🔕 Silencio'}</span>
          </button>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            KDS Vivo
          </span>

          <button
            type="button"
            onClick={() => void loadKdsData()}
            disabled={isRefreshing}
            className="rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
          >
            {isRefreshing ? 'Cargando...' : '↻ Refrescar'}
          </button>
        </div>
      </div>

      {/* Grid de Tarjetas de Comanda KDS */}
      {visibleOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/50 p-16 text-center">
          <span className="text-4xl">👨‍🍳</span>
          <h3 className="mt-3 text-lg font-bold">Cocina al día</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No hay comandas pendientes en este momento. Las nuevas órdenes de los meseros aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {visibleOrders.map((ord) => {
            const minutesElapsed =
              currentTime > 0
                ? Math.max(0, Math.floor((currentTime - new Date(ord.openedAt).getTime()) / 60000))
                : 0;

            // Semáforo de tiempo de espera:
            // <10 min: Verde normal
            // 10-20 min: Amarillo alerta
            // >20 min: Rojo urgente
            const isUrgent = minutesElapsed >= 20;
            const isWarning = minutesElapsed >= 10 && minutesElapsed < 20;

            const headerBg = isUrgent
              ? 'bg-rose-500 text-white'
              : isWarning
                ? 'bg-amber-500 text-white'
                : 'bg-muted/80 text-foreground';

            const cardBorder = isUrgent
              ? 'border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : isWarning
                ? 'border-amber-500 shadow-sm'
                : 'border-border';

            const pendingItems = ord.items.filter((it) => it.status === 'pendiente');
            const preparingItems = ord.items.filter((it) => it.status === 'preparando');
            const readyItems = ord.items.filter((it) => it.status === 'listo');

            return (
              <div
                key={ord.id}
                className={`flex flex-col justify-between overflow-hidden rounded-2xl border bg-card transition-all ${cardBorder}`}
              >
                {/* Cabecera de la Comanda */}
                <div>
                  <div className={`flex items-center justify-between p-3.5 ${headerBg}`}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                        {ord.zone || 'Salón'}
                      </span>
                      <h4 className="text-xl font-black tracking-tight">Mesa #{ord.tableNumber}</h4>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 rounded-md bg-black/20 px-2 py-0.5 font-mono text-xs font-bold backdrop-blur-xs">
                        <span>⏱️</span>
                        <span>{minutesElapsed} min</span>
                      </div>
                      <p className="mt-0.5 text-[10px] opacity-80">#{ord.orderNumber}</p>
                    </div>
                  </div>

                  {/* Lista de Platos e Ítems */}
                  <div className="divide-y divide-border/50 p-3 space-y-2">
                    {ord.items.map((it) => {
                      const isPending = it.status === 'pendiente';
                      const isPreparing = it.status === 'preparando';
                      const isReady = it.status === 'listo';

                      return (
                        <div key={it.id} className="pt-2 first:pt-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-black text-primary">
                                  {it.quantity}x
                                </span>
                                <span
                                  className={`text-sm font-bold ${
                                    isReady ? 'text-muted-foreground line-through' : 'text-foreground'
                                  }`}
                                >
                                  {it.productName}
                                </span>
                              </div>

                              {it.notes && (
                                <p className="mt-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                                  ⚠️ {it.notes}
                                </p>
                              )}
                            </div>

                            {/* Botón táctil por plato */}
                            <div>
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => void updateItemStatus([it.id], 'preparando')}
                                  className="rounded-lg bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-600 hover:bg-orange-500 hover:text-white transition-colors"
                                >
                                  Preparar
                                </button>
                              )}
                              {isPreparing && (
                                <button
                                  type="button"
                                  onClick={() => void updateItemStatus([it.id], 'listo')}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors"
                                >
                                  ✓ Listo
                                </button>
                              )}
                              {isReady && (
                                <button
                                  type="button"
                                  onClick={() => void updateItemStatus([it.id], 'preparando')}
                                  className="text-[10px] text-muted-foreground underline hover:text-foreground"
                                  title="Regresar a preparación"
                                >
                                  Deshacer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Acciones Rápidas Masivas por Tarjeta */}
                <div className="border-t border-border/50 bg-muted/30 p-2.5">
                  {pendingItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => void updateItemStatus(pendingItems.map((i) => i.id), 'preparando')}
                      className="w-full rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-600 transition-colors"
                    >
                      ▶️ Marchar Todo ({pendingItems.length})
                    </button>
                  ) : preparingItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => void updateItemStatus(preparingItems.map((i) => i.id), 'listo')}
                      className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                    >
                      ✓ Todo Listo para Salón ({preparingItems.length})
                    </button>
                  ) : readyItems.length > 0 ? (
                    <div className="text-center text-xs font-bold text-emerald-600">
                      🍽️ Comanda Completa Lista
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
