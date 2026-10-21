'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Bell, BellOff, Clock, Flame, Check, CheckCheck, RefreshCw } from 'lucide-react';

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

type OrderStage = 'nuevo' | 'preparando' | 'listo';

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
    osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(2640, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.2);
    osc2.stop(ctx.currentTime + 1.2);
  } catch {
    // Autoplay policy fallback
  }
}

export function KdsBoard({ restaurantId }: { restaurantId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stationFilter, setStationFilter] = useState<'todas' | 'cocina' | 'barra'>('todas');
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const immediate = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
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
            created_at,
            products (
              station
            )
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
        status: string;
        created_at: string;
        products: { station: string } | Array<{ station: string }> | null;
      };

      const mapped: KdsOrder[] = data.map((raw) => {
        const table = raw.tables as unknown as RawTable;
        const rawItems = (raw.order_items || []) as unknown as RawItem[];

        const items: KdsItem[] = rawItems.map((it) => {
          const product = Array.isArray(it.products) ? it.products[0] : it.products;
          return {
            id: it.id,
            productId: it.product_id,
            productName: it.product_name,
            quantity: it.quantity,
            notes: it.notes,
            status: it.status as KdsItem['status'],
            station: (product?.station as 'cocina' | 'barra') || 'cocina',
            statusChangedAt: it.created_at,
          };
        });

        return {
          id: raw.id,
          orderNumber: raw.order_number,
          tableNumber: table?.table_number ?? 0,
          zone: table?.zone ?? null,
          openedAt: raw.opened_at,
          status: raw.status,
          items,
        };
      });

      // Detectar órdenes nuevas para sonido y flash
      const currentIds = new Set(mapped.map((o) => o.id));
      if (previousOrderIdsRef.current.size > 0) {
        const incoming = mapped.filter((o) => !previousOrderIdsRef.current.has(o.id));
        if (incoming.length > 0) {
          if (soundEnabled) playKitchenChime();
          setNewOrderIds(new Set(incoming.map((o) => o.id)));
          setTimeout(() => setNewOrderIds(new Set()), 3000);
        }
      }
      previousOrderIdsRef.current = currentIds;

      setOrders(mapped);
    },
    [restaurantId, supabase, soundEnabled]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadKdsData(), 0);

    const channel = supabase
      .channel(`kds-orders-${restaurantId}`)
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

  // Avanzar todos los ítems de una orden al siguiente estado
  const advanceOrderStage = async (order: KdsOrder, targetStatus: 'preparando' | 'listo' | 'entregado') => {
    const itemIds = order.items.map((it) => it.id);
    if (!itemIds.length) return;

    try {
      await fetch('/api/kds/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, nextStatus: targetStatus }),
      });
      await loadKdsData(true);
    } catch {
      // Reintentar en siguiente ciclo de sync
    }
  };

  // Filtrar ítems por estación si está seleccionada
  const filteredOrders = useMemo(() => {
    if (stationFilter === 'todas') return orders;
    return orders
      .map((ord) => ({
        ...ord,
        items: ord.items.filter((it) => it.station === stationFilter),
      }))
      .filter((ord) => ord.items.length > 0);
  }, [orders, stationFilter]);

  // Clasificar cada orden en su columna según el estado de sus platos
  const columns = useMemo(() => {
    const nuevo: KdsOrder[] = [];
    const preparando: KdsOrder[] = [];
    const listo: KdsOrder[] = [];

    for (const ord of filteredOrders) {
      const hasPending = ord.items.some((it) => it.status === 'pendiente');
      const hasPreparing = ord.items.some((it) => it.status === 'preparando');
      const allReady = ord.items.length > 0 && ord.items.every((it) => it.status === 'listo');

      if (hasPending) {
        nuevo.push(ord);
      } else if (hasPreparing) {
        preparando.push(ord);
      } else if (allReady) {
        listo.push(ord);
      }
    }

    return { nuevo, preparando, listo };
  }, [filteredOrders]);

  return (
    <div className="min-h-screen bg-[#111111] text-white p-4 sm:p-8 font-sans selection:bg-[#FFC21A] selection:text-black">
      {/* Top Header Barra de Control */}
      <header className="mb-8 flex flex-col gap-4 border-b border-[#2E2E2E] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[14px] font-extrabold uppercase tracking-widest text-[#FFC21A]">
              KDS Pantalla de Cocina
            </span>
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-extrabold tracking-tight text-white leading-none">
            Comandas en Marcha
          </h1>
        </div>

        {/* Controles de Estación y Sonido */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-[#1C1C1C] border border-[#2E2E2E] p-1">
            {(['todas', 'cocina', 'barra'] as const).map((station) => (
              <button
                key={station}
                type="button"
                onClick={() => setStationFilter(station)}
                className={`rounded-full px-5 py-2.5 text-base font-extrabold capitalize transition-colors ${
                  stationFilter === station
                    ? 'bg-white text-[#111111]'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                {station}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-5 text-base font-bold transition-colors ${
              soundEnabled
                ? 'border-[#2E2E2E] bg-[#1C1C1C] text-white hover:bg-[#252525]'
                : 'border-[#2E2E2E] bg-transparent text-[#666666]'
            }`}
            aria-label={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
          >
            {soundEnabled ? (
              <>
                <Bell className="h-5 w-5 text-[#FFC21A]" />
                <span>Sonido ON</span>
              </>
            ) : (
              <>
                <BellOff className="h-5 w-5" />
                <span>Silencio</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void loadKdsData()}
            disabled={isRefreshing}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#2E2E2E] bg-[#1C1C1C] px-5 text-base font-bold text-white hover:bg-[#252525] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </header>

      {/* 3 Columnas Principales: Nuevo, En preparación, Listo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna 1: Nuevo */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-3">
            <h2 className="text-[22px] font-extrabold uppercase tracking-wide text-white">
              Nuevo
            </h2>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#1C1C1C] border border-[#2E2E2E] px-2 text-base font-extrabold text-white">
              {columns.nuevo.length}
            </span>
          </div>

          {columns.nuevo.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#2E2E2E] bg-[#161616] p-10 text-center">
              <p className="text-lg text-[#666666]">Sin órdenes nuevas</p>
            </div>
          ) : (
            <div className="space-y-5">
              {columns.nuevo.map((ord) => (
                <KdsCard
                  key={ord.id}
                  order={ord}
                  currentTime={currentTime}
                  stage="nuevo"
                  isFlashing={newOrderIds.has(ord.id)}
                  onAdvance={() => void advanceOrderStage(ord, 'preparando')}
                />
              ))}
            </div>
          )}
        </section>

        {/* Columna 2: En Preparación */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-3">
            <h2 className="text-[22px] font-extrabold uppercase tracking-wide text-white">
              En Preparación
            </h2>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#1C1C1C] border border-[#2E2E2E] px-2 text-base font-extrabold text-[#FFC21A]">
              {columns.preparando.length}
            </span>
          </div>

          {columns.preparando.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#2E2E2E] bg-[#161616] p-10 text-center">
              <p className="text-lg text-[#666666]">Cocina libre</p>
            </div>
          ) : (
            <div className="space-y-5">
              {columns.preparando.map((ord) => (
                <KdsCard
                  key={ord.id}
                  order={ord}
                  currentTime={currentTime}
                  stage="preparando"
                  isFlashing={newOrderIds.has(ord.id)}
                  onAdvance={() => void advanceOrderStage(ord, 'listo')}
                />
              ))}
            </div>
          )}
        </section>

        {/* Columna 3: Listo */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-3">
            <h2 className="text-[22px] font-extrabold uppercase tracking-wide text-white">
              Listo para Entrega
            </h2>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#1C1C1C] border border-[#2E2E2E] px-2 text-base font-extrabold text-emerald-400">
              {columns.listo.length}
            </span>
          </div>

          {columns.listo.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#2E2E2E] bg-[#161616] p-10 text-center">
              <p className="text-lg text-[#666666]">Todo despachado</p>
            </div>
          ) : (
            <div className="space-y-5">
              {columns.listo.map((ord) => (
                <KdsCard
                  key={ord.id}
                  order={ord}
                  currentTime={currentTime}
                  stage="listo"
                  isFlashing={newOrderIds.has(ord.id)}
                  onAdvance={() => void advanceOrderStage(ord, 'entregado')}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KdsCard({
  order,
  currentTime,
  stage,
  isFlashing,
  onAdvance,
}: {
  order: KdsOrder;
  currentTime: number;
  stage: OrderStage;
  isFlashing: boolean;
  onAdvance: () => void;
}) {
  const minutesElapsed =
    currentTime > 0
      ? Math.max(0, Math.floor((currentTime - new Date(order.openedAt).getTime()) / 60000))
      : 0;

  // Semáforo con texto explícito (no solo color):
  // <10 min: normal
  // 10-20 min: demora moderada (ámbar)
  // >20 min: demora alta (rojo)
  let borderClass = 'border-[#2E2E2E]';
  let waitStatusText = `${minutesElapsed} min · A tiempo`;
  let timeBadgeColor = 'text-[#888888]';

  if (minutesElapsed >= 20) {
    borderClass = 'border-red-500 ring-2 ring-red-500/30';
    waitStatusText = `${minutesElapsed} min · Demora alta`;
    timeBadgeColor = 'text-red-400 font-extrabold';
  } else if (minutesElapsed >= 10) {
    borderClass = 'border-[#FFC21A] ring-2 ring-[#FFC21A]/30';
    waitStatusText = `${minutesElapsed} min · Esperando`;
    timeBadgeColor = 'text-[#FFC21A] font-extrabold';
  }

  // Botón enorme de acción única
  let actionLabel = 'Empezar a preparar';
  let actionIcon = Flame;
  let actionBg = 'bg-[#FFC21A] text-[#111111] hover:bg-[#F2B400]';

  if (stage === 'preparando') {
    actionLabel = 'Marcar como listo';
    actionIcon = Check;
    actionBg = 'bg-[#FFC21A] text-[#111111] hover:bg-[#F2B400]';
  } else if (stage === 'listo') {
    actionLabel = 'Entregar al mesero';
    actionIcon = CheckCheck;
    actionBg = 'bg-white text-[#111111] hover:bg-zinc-200';
  }

  const ActionIconComponent = actionIcon;

  return (
    <article
      className={`flex flex-col justify-between rounded-[24px] border bg-[#1C1C1C] p-6 shadow-xl transition-all ${borderClass} ${
        isFlashing ? 'kds-new' : ''
      }`}
    >
      <div>
        {/* Cabecera: Número Gigante (40px+) + Mesa */}
        <div className="flex items-start justify-between gap-4 border-b border-[#2E2E2E] pb-4">
          <div>
            <p className="text-[14px] font-extrabold uppercase tracking-widest text-[#888888]">
              {order.zone || 'Salón'}
            </p>
            <h3 className="text-[28px] font-extrabold text-white leading-tight">
              Mesa #{order.tableNumber}
            </h3>
          </div>

          <div className="text-right">
            <span className="text-[40px] font-extrabold leading-none text-white tracking-tight">
              #{order.orderNumber}
            </span>
            <div className="mt-1 flex items-center justify-end gap-1.5 text-base">
              <Clock className="h-4 w-4 text-[#888888]" />
              <span className={timeBadgeColor}>{waitStatusText}</span>
            </div>
          </div>
        </div>

        {/* Lista de Platos en 22px+ ExtraBold para lectura a distancia */}
        <ul className="divide-y divide-[#2E2E2E]/60 py-4 space-y-4">
          {order.items.map((it) => (
            <li key={it.id} className="pt-4 first:pt-0">
              <div className="flex items-baseline gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#252525] border border-[#333333] text-[22px] font-extrabold text-[#FFC21A]">
                  {it.quantity}
                </span>
                <span className="text-[22px] font-extrabold text-white leading-snug">
                  {it.productName}
                </span>
              </div>

              {it.notes && (
                <div className="mt-2 ml-13 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-base font-bold text-[#FFC21A]">
                  Nota: {it.notes}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Un solo botón enorme por tarjeta (Mínimo 64px de alto) */}
      <div className="mt-6 pt-4 border-t border-[#2E2E2E]">
        <button
          type="button"
          onClick={onAdvance}
          className={`h-16 w-full rounded-full text-xl font-extrabold tracking-wide transition-transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg ${actionBg}`}
        >
          <ActionIconComponent className="h-6 w-6 stroke-[2.5]" />
          <span>{actionLabel}</span>
        </button>
      </div>
    </article>
  );
}
