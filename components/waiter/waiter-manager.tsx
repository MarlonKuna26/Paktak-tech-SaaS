'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Wifi,
  WifiOff,
  Clock,
  Zap,
  RefreshCw,
  Printer,
  Search,
  Plus,
  Minus,
  Check,
  AlertCircle,
  CreditCard,
  Bell,
  LayoutGrid,
  ClipboardList,
  Grid,
  List,
  ShoppingBag,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { offlineDb, type CachedProduct, type CachedTable, type LocalOrder } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { getProductImageUrl } from '@/lib/orders/product-images';
import { ThermalReceiptModal } from '@/components/orders/thermal-receipt-modal';
import { TableCheckoutModal, type TableOrderDetails } from '@/components/tables/table-checkout-modal';

function playWaiterChime() {
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
    osc.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.15); // E6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
  } catch {
    // Silencio si no hubo interacción previa
  }
}

type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  notes: string;
  imageUrl?: string;
};

export function WaiterManager({
  restaurantId,
  waiterId,
  initialTableId,
  onBackToTables,
  onGoToOrders,
}: {
  restaurantId: string;
  waiterId: string;
  initialTableId?: string;
  onBackToTables?: () => void;
  onGoToOrders?: () => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const initialTableAppliedRef = useRef(false);

  // Estado de sincronización
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncedAt: null as Date | null,
  });

  // Datos locales
  const [tables, setTables] = useState<CachedTable[]>([]);
  const [products, setProducts] = useState<CachedProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<LocalOrder[]>([]);

  // Selección de comanda
  const [selectedTable, setSelectedTable] = useState<CachedTable | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [batterySaver, setBatterySaver] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<LocalOrder | null>(null);

  // Estado para cobro de mesa (Fase 8 & Flujo Mesero)
  const [checkoutOrder, setCheckoutOrder] = useState<TableOrderDetails | null>(null);
  const [isFetchingCheckout, setIsFetchingCheckout] = useState(false);

  // Alertas en vivo de cocina
  const [kitchenAlerts, setKitchenAlerts] = useState<Array<{ id: string; message: string; time: string }>>([]);

  const handleOpenTableCheckout = async (table: CachedTable) => {
    setIsFetchingCheckout(true);
    setFeedback(null);
    try {
      const { data: orderData, error: ordErr } = await supabase
        .from('orders')
        .select('id, order_number, total_cents, order_items(id, product_name, quantity, unit_price_cents, notes)')
        .eq('table_id', table.id)
        .in('status', ['abierta', 'en_espera'])
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setIsFetchingCheckout(false);

      if (ordErr || !orderData) {
        setFeedback({
          ok: false,
          text: `No se encontró una comanda abierta para la Mesa #${table.tableNumber}.`,
        });
        return;
      }

      type RawOrderItem = {
        id: string;
        product_name: string;
        quantity: number;
        unit_price_cents: number;
        notes: string | null;
      };

      const rawItems = (orderData.order_items || []) as RawOrderItem[];
      const subtotal = rawItems.reduce((acc, it) => acc + it.unit_price_cents * it.quantity, 0);

      setCheckoutOrder({
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        tableNumber: table.tableNumber,
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
      setFeedback({
        ok: false,
        text: 'Error de red al consultar la comanda de la mesa.',
      });
    }
  };

  // 1. Suscribirse al Sync Engine
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Cargar órdenes recientes de Dexie
  const loadRecentOrders = useCallback(async () => {
    const localOrders = await offlineDb.localOrders
      .where('restaurantId')
      .equals(restaurantId)
      .reverse()
      .limit(10)
      .toArray();
    setRecentOrders(localOrders);
  }, [restaurantId]);

  // 2. Cargar y cachear datos en Dexie
  const loadData = useCallback(async () => {
    try {
      const [{ data: tablesData }, { data: productsData }] = await Promise.all([
        supabase
          .from('tables')
          .select('id, restaurant_id, table_number, capacity, status, zone')
          .eq('restaurant_id', restaurantId)
          .order('table_number', { ascending: true }),
        supabase
          .from('products')
          .select('id, restaurant_id, category_id, name, description, price_cents, station, active, image_url, category:categories(name)')
          .eq('restaurant_id', restaurantId)
          .eq('active', true)
          .order('name', { ascending: true }),
      ]);

      if (tablesData && tablesData.length > 0) {
        const formattedTables: CachedTable[] = tablesData.map((t) => ({
          id: t.id,
          restaurantId: t.restaurant_id,
          tableNumber: t.table_number,
          capacity: t.capacity,
          status: t.status,
          zone: t.zone,
        }));
        await offlineDb.cachedTables.bulkPut(formattedTables);
        setTables(formattedTables);
      }

      if (productsData && productsData.length > 0) {
        type RawProductWithCategory = {
          id: string;
          restaurant_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price_cents: number;
          station: 'cocina' | 'barra';
          active: boolean;
          image_url?: string | null;
          category?: { name: string } | null;
        };
        const rawList = productsData as unknown as RawProductWithCategory[];
        const formattedProducts: CachedProduct[] = rawList.map((p) => ({
          id: p.id,
          restaurantId: p.restaurant_id,
          categoryId: p.category_id,
          categoryName: p.category?.name || null,
          name: p.name,
          description: p.description,
          priceCents: p.price_cents,
          station: p.station,
          active: p.active,
          imageUrl: p.image_url || null,
        }));
        await offlineDb.cachedMenu.bulkPut(formattedProducts);
        setProducts(formattedProducts);
      }
    } catch {
      const localTables = await offlineDb.cachedTables
        .where('restaurantId')
        .equals(restaurantId)
        .sortBy('tableNumber');
      const localProducts = await offlineDb.cachedMenu
        .where('restaurantId')
        .equals(restaurantId)
        .toArray();

      if (localTables.length > 0) setTables(localTables);
      if (localProducts.length > 0) setProducts(localProducts);
    }

    await loadRecentOrders();
  }, [loadRecentOrders, restaurantId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  // Preseleccionar mesa automáticamente si viene por URL (?tableId=...)
  useEffect(() => {
    if (!initialTableAppliedRef.current && initialTableId && tables.length > 0) {
      const targetTable = tables.find((t) => t.id === initialTableId);
      if (targetTable) {
        setSelectedTable(targetTable);
        initialTableAppliedRef.current = true;
      }
    }
  }, [initialTableId, tables]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecentOrders(), 0);
    return () => window.clearTimeout(timer);
  }, [syncStatus.pendingCount, loadRecentOrders]);

  // Escuchar avisos de platos listos desde cocina
  useEffect(() => {
    const channel = supabase
      .channel(`waiter-kds-alerts-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` },
        () => void loadData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        (payload) => {
          if (payload.new && (payload.new as { status?: string }).status === 'listo') {
            const raw = payload.new as { product_name?: string };
            playWaiterChime();
            setKitchenAlerts((prev) => [
              {
                id: Math.random().toString(),
                message: `¡Plato listo en cocina! ${raw.product_name || 'Comanda lista para servir'}`,
                time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
              },
              ...prev.slice(0, 4),
            ]);
            void loadData();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadData, restaurantId, supabase]);

  function addToCart(product: CachedProduct) {
    const imgUrl = getProductImageUrl(product.name, product.categoryName, product.imageUrl);
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, 99) }
            : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          priceCents: product.priceCents,
          quantity: 1,
          notes: '',
          imageUrl: imgUrl,
        },
      ];
    });
  }

  function changeQuantity(productId: string, quantity: number) {
    setCart((current) =>
      quantity < 1
        ? current.filter((item) => item.productId !== productId)
        : current.map((item) =>
            item.productId === productId ? { ...item, quantity: Math.min(quantity, 99) } : item,
          ),
    );
  }

  function updateItemNotes(productId: string, notes: string) {
    setCart((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, notes: notes.slice(0, 150) } : item,
      ),
    );
  }

  const cartTotalCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    [cart],
  );

  async function handleSubmitOrder(andCheckout = false) {
    setFeedback(null);

    if (!selectedTable) {
      setFeedback({ ok: false, text: 'Por favor selecciona una mesa antes de enviar la orden.' });
      return;
    }
    if (!cart.length) {
      setFeedback({ ok: false, text: 'Agrega al menos un producto a la orden.' });
      return;
    }

    setIsSubmitting(true);

    const orderId = crypto.randomUUID();
    const mutationId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const itemsPayload = cart.map((item) => ({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.name,
      unitPriceCents: item.priceCents,
      quantity: item.quantity,
      notes: item.notes.trim() || undefined,
    }));

    try {
      const localOrder: LocalOrder = {
        id: orderId,
        restaurantId,
        tableId: selectedTable.id,
        tableNumber: selectedTable.tableNumber,
        waiterId,
        status: 'abierta',
        totalCents: cartTotalCents,
        items: itemsPayload.map((it) => ({
          id: it.id,
          productId: it.productId,
          productName: it.productName,
          unitPriceCents: it.unitPriceCents,
          quantity: it.quantity,
          notes: it.notes,
          status: 'pendiente',
        })),
        createdAt: nowIso,
        isSynced: false,
      };
      await offlineDb.localOrders.put(localOrder);

      await syncEngine.enqueue({
        id: mutationId,
        restaurantId,
        actionType: 'CREATE_ORDER',
        payload: {
          orderId,
          tableId: selectedTable.id,
          tableNumber: selectedTable.tableNumber,
          waiterId,
          items: itemsPayload,
          clientTimestamp: nowIso,
        },
      });

      // Asegurar sincronización inmediata con el servidor antes de cobrar
      await syncEngine.checkConnectionAndSync();

      if (andCheckout) {
        setCheckoutOrder({
          orderId,
          orderNumber: 0,
          tableNumber: selectedTable.tableNumber,
          zone: selectedTable.zone,
          subtotalCents: cartTotalCents,
          items: itemsPayload.map((it) => ({
            id: it.id,
            productName: it.productName,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
            notes: it.notes || null,
          })),
        });
      }

      setCart([]);
      setIsSubmitting(false);
      setFeedback({
        ok: true,
        text: `Orden de Mesa #${selectedTable.tableNumber} registrada exitosamente.`,
      });
      await loadRecentOrders();
    } catch {
      setIsSubmitting(false);
      setFeedback({
        ok: false,
        text: 'Error inesperado al guardar la comanda localmente.',
      });
    }
  }

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat =
        categoryFilter === 'todas' ||
        p.station === categoryFilter ||
        p.categoryName === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, categoryFilter]);

  return (
    <div className={`space-y-6 ${batterySaver ? 'bg-black text-white p-4 rounded-[24px]' : ''}`}>
      {/* Barra de Estado de Conexión y Opciones */}
      <div className="flex flex-col gap-3 rounded-[24px] border border-[#E8E8E8] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {syncStatus.isOnline ? (
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#15803D]" />
              <span className="text-sm font-bold text-[#15803D] flex items-center gap-1.5">
                <Wifi className="h-4 w-4" /> En línea
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#B91C1C]" />
              <span className="text-sm font-bold text-[#B91C1C] flex items-center gap-1.5">
                <WifiOff className="h-4 w-4" /> Modo sin conexión
              </span>
            </div>
          )}

          {syncStatus.pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFE6A5] bg-[#FFF8E7] px-3 py-1 text-xs font-bold text-[#9A6700]">
              <Clock className="h-3.5 w-3.5" /> {syncStatus.pendingCount} por sincronizar
            </span>
          )}

          {syncStatus.isSyncing && (
            <span className="text-xs text-[#6B6B6B]">Sincronizando...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onBackToTables && (
            <button
              type="button"
              onClick={onBackToTables}
              className="h-10 px-4 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs cursor-pointer"
            >
              <LayoutGrid className="h-4 w-4 text-[#EAA228]" />
              <span>Plano de Mesas</span>
            </button>
          )}

          {onGoToOrders && (
            <button
              type="button"
              onClick={onGoToOrders}
              className="h-10 px-4 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs cursor-pointer"
            >
              <ClipboardList className="h-4 w-4 text-[#EAA228]" />
              <span>Caja & Cobros</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setBatterySaver(!batterySaver)}
            className={`h-10 px-4 rounded-full border text-xs font-bold transition-colors flex items-center gap-1.5 ${
              batterySaver
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                : 'border-[#E8E8E8] bg-white text-[#1A1A1A] hover:bg-[#F7F7F7]'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{batterySaver ? 'Ahorro activo' : 'Modo ahorro'}</span>
          </button>

          <button
            type="button"
            onClick={() => void syncEngine.checkConnectionAndSync()}
            className="h-10 px-4 rounded-full border border-[#E8E8E8] bg-white text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5 hover:bg-[#F7F7F7]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {/* Avisos de Cocina en Tiempo Real */}
      {kitchenAlerts.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-extrabold text-sm">
              <Bell className="w-5 h-5 text-emerald-600 animate-bounce" />
              <span>Platos Listos en Cocina ({kitchenAlerts.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setKitchenAlerts([])}
              className="text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 font-bold underline"
            >
              Cerrar avisos
            </button>
          </div>
          <div className="space-y-1.5">
            {kitchenAlerts.map((alt) => (
              <div
                key={alt.id}
                className="flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-100 bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-xl border border-emerald-500/20"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-semibold">{alt.message}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">{alt.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <div
          role={feedback.ok ? 'status' : 'alert'}
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-medium ${
            feedback.ok
              ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
              : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
          }`}
        >
          {feedback.ok ? <Check className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <p>{feedback.text}</p>
        </div>
      )}

      {/* 1. Selector de Mesa Tipo Píldora */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
          1. Selecciona la mesa
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {tables.map((table) => {
            const isSelected = selectedTable?.id === table.id;
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => setSelectedTable(table)}
                className={`flex min-w-[100px] flex-col items-center justify-center rounded-2xl border px-4 py-3 transition-colors ${
                  isSelected
                    ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                    : table.status === 'ocupada'
                      ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                      : 'border-[#E8E8E8] bg-white text-[#1A1A1A] hover:border-[#1A1A1A]'
                }`}
              >
                <span className="text-[11px] font-semibold opacity-70">{table.zone || 'Salón'}</span>
                <span className="text-base font-extrabold">Mesa #{table.tableNumber}</span>
                <span className="text-[10px] mt-0.5 opacity-80 capitalize">
                  {isSelected ? 'Seleccionada' : table.status}
                </span>
              </button>
            );
          })}

          {!tables.length && (
            <p className="text-xs text-[#6B6B6B] py-2">
              No hay mesas registradas. Crea tus mesas en la sección de administración.
            </p>
          )}
        </div>
      </section>

      {/* Acciones de Mesa Ocupada: Cobro Directo por el Mesero */}
      {selectedTable?.status === 'ocupada' && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                Mesa #{selectedTable.tableNumber} está actualmente OCUPADA
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Puedes agregar más platos a la orden o cerrar la cuenta y cobrar al cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleOpenTableCheckout(selectedTable)}
            disabled={isFetchingCheckout}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#EAA228] hover:bg-[#D99318] px-5 py-2.5 text-xs font-black text-zinc-950 shadow-xs transition-colors shrink-0 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isFetchingCheckout ? 'Consultando orden...' : `Cobrar Mesa #${selectedTable.tableNumber}`}</span>
          </button>
        </div>
      )}

      {/* 2. Catálogo y Comanda Activa */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px] items-start">
        {/* Catálogo de Productos */}
        <section className="min-w-0 space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                  2. Platos y bebidas {selectedTable && `(Mesa #${selectedTable.tableNumber})`}
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Toca la foto o el plato para agregarlo rápidamente a la orden
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B6B6B]" />
                  <input
                    type="text"
                    placeholder="Buscar plato o bebida..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 rounded-full border border-[#E8E8E8] bg-white pl-9 pr-4 text-xs text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none shadow-2xs"
                  />
                </div>

                {/* Toggle Vista con Fotos / Compacta */}
                <div className="flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`h-8 px-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                    }`}
                    title="Vista Cuadrícula con Fotos"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Fotos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('compact')}
                    className={`h-8 px-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewMode === 'compact'
                        ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                    }`}
                    title="Vista Compacta"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lista</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Categorías deslizables */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['todas', 'cocina', 'barra'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`h-9 px-4 rounded-full text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-[#EAA228] text-zinc-950 shadow-xs'
                      : 'border border-[#E8E8E8] bg-white text-zinc-700 hover:bg-[#F7F7F7]'
                  }`}
                >
                  {cat === 'todas' ? 'Todos los platos' : cat === 'cocina' ? '🍳 Cocina' : '🍹 Barra'}
                </button>
              ))}

              {availableCategories.map((catName) => (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setCategoryFilter(catName)}
                  className={`h-9 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilter === catName
                      ? 'bg-[#EAA228] text-zinc-950 shadow-xs'
                      : 'border border-[#E8E8E8] bg-white text-zinc-700 hover:bg-[#F7F7F7]'
                  }`}
                >
                  {catName}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((prod) => {
                const inCart = cart.find((it) => it.productId === prod.id);
                const imgUrl = getProductImageUrl(prod.name, prod.categoryName, prod.imageUrl);

                return (
                  <article
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] border transition-all duration-200 cursor-pointer ${
                      inCart
                        ? 'border-[#EAA228] bg-amber-50/20 dark:bg-amber-950/20 shadow-md ring-2 ring-[#EAA228]/40'
                        : 'border-[#E8E8E8] bg-white dark:bg-zinc-900 hover:border-amber-400/70 dark:hover:border-amber-500/50 shadow-2xs hover:shadow-md'
                    }`}
                  >
                    {/* Imagen apetitosa del plato con badges flotantes */}
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      <img
                        src={imgUrl}
                        alt={prod.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

                      {/* Badge superior: Categoría & Indicador En Orden */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                        <span className="rounded-full bg-black/65 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white truncate max-w-[140px]">
                          {prod.categoryName || (prod.station === 'barra' ? 'Barra' : 'Cocina')}
                        </span>

                        {inCart && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EAA228] text-zinc-950 px-2.5 py-0.5 text-[11px] font-black shadow-md animate-in fade-in zoom-in">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>{inCart.quantity} en orden</span>
                          </span>
                        )}
                      </div>

                      {/* Precio flotante y botón rápido de tocar */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="rounded-xl bg-[#EAA228] px-2.5 py-1 font-mono text-xs font-black text-zinc-950 shadow-xs">
                          ${(prod.priceCents / 100).toFixed(2)}
                        </span>
                        <span className="rounded-full bg-black/50 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 opacity-90 group-hover:opacity-100">
                          + Tocar para pedir
                        </span>
                      </div>
                    </div>

                    {/* Detalles y controles de cantidad */}
                    <div className="p-3.5 flex flex-col justify-between flex-1">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#1A1A1A] dark:text-zinc-100 leading-snug">
                          {prod.name}
                        </h3>
                        {prod.description && (
                          <p className="mt-1 text-[11px] text-[#6B6B6B] dark:text-zinc-400 line-clamp-2">
                            {prod.description}
                          </p>
                        )}
                      </div>

                      <div
                        className="mt-3.5 flex items-center justify-between border-t border-[#E8E8E8] dark:border-zinc-800 pt-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-bold text-[#6B6B6B] dark:text-zinc-400 capitalize">
                          {prod.station === 'barra' ? '🍹 Barra' : '🍳 Cocina'}
                        </span>

                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => changeQuantity(prod.id, inCart.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E8E8] bg-white dark:bg-zinc-800 text-[#1A1A1A] dark:text-zinc-100 hover:bg-[#F7F7F7] active:scale-95 transition-transform cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center font-black text-xs text-[#1A1A1A] dark:text-zinc-100">
                              {inCart.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeQuantity(prod.id, inCart.quantity + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAA228] text-zinc-950 hover:bg-[#D99318] active:scale-95 transition-transform font-bold cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(prod)}
                            className="h-8.5 px-3.5 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-xs font-black text-zinc-950 transition-all flex items-center gap-1 active:scale-95 shadow-2xs cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Pedir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Vista Compacta */
            <div className="space-y-2">
              {filteredProducts.map((prod) => {
                const inCart = cart.find((it) => it.productId === prod.id);
                const imgUrl = getProductImageUrl(prod.name, prod.categoryName, prod.imageUrl);

                return (
                  <article
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      inCart
                        ? 'border-[#EAA228] bg-amber-50/20 dark:bg-amber-950/20 shadow-xs ring-1 ring-[#EAA228]/40'
                        : 'border-[#E8E8E8] bg-white dark:bg-zinc-900 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 shadow-2xs">
                        <img src={imgUrl} alt={prod.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                          {prod.name}
                        </h4>
                        <span className="text-[10px] text-zinc-500 capitalize">
                          {prod.categoryName || prod.station}
                        </span>
                        <div className="font-mono text-xs font-black text-[#EAA228]">
                          ${(prod.priceCents / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      {inCart ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => changeQuantity(prod.id, inCart.quantity - 1)}
                            className="h-7 w-7 rounded-full border border-[#E8E8E8] bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#F7F7F7] cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-black text-xs">{inCart.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(prod.id, inCart.quantity + 1)}
                            className="h-7 w-7 rounded-full bg-[#EAA228] flex items-center justify-center text-zinc-950 font-bold hover:bg-[#D99318] cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(prod)}
                          className="h-8 px-3 rounded-full bg-[#EAA228] text-xs font-black text-zinc-950 hover:bg-[#D99318] cursor-pointer"
                        >
                          + Pedir
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!filteredProducts.length && (
            <div className="rounded-[24px] border border-dashed border-[#E8E8E8] p-8 text-center text-sm text-[#6B6B6B]">
              No hay productos registrados en esta categoría.
            </div>
          )}
        </section>

        {/* Orden Activa Lateral */}
        <aside
          id="waiter-active-order"
          className="w-full shrink-0 min-w-0 rounded-[24px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 lg:sticky lg:top-4 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#EAA228] mb-0.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Comanda en Vivo</span>
              </div>
              <h3 className="font-extrabold text-[#1A1A1A] dark:text-zinc-100 text-base">Orden actual</h3>
              <p className="text-xs text-[#6B6B6B]">
                {selectedTable ? `Mesa #${selectedTable.tableNumber}` : 'Selecciona una mesa'}
              </p>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs font-semibold text-[#6B6B6B] hover:text-[#B91C1C]"
              >
                Vaciar
              </button>
            )}
          </div>

          <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="rounded-2xl border border-[#E8E8E8] bg-[#F7F7F7] dark:bg-zinc-800/60 p-3 text-xs space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-200">
                    <img
                      src={item.imageUrl || getProductImageUrl(item.name)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-extrabold text-[#1A1A1A] dark:text-zinc-100 truncate block">
                        {item.name}
                      </span>
                      <span className="font-mono font-black text-[#1A1A1A] dark:text-zinc-100 shrink-0">
                        ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#6B6B6B]">
                      ${(item.priceCents / 100).toFixed(2)} c/u
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[#6B6B6B]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.productId, item.quantity - 1)}
                      className="h-7 w-7 rounded-full border border-[#E8E8E8] bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#F7F7F7] cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-extrabold text-[#1A1A1A] dark:text-zinc-100">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.productId, item.quantity + 1)}
                      className="h-7 w-7 rounded-full bg-[#EAA228] flex items-center justify-center text-zinc-950 font-bold hover:bg-[#D99318] cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.productId, 0)}
                    className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Instrucción (ej. sin cebolla, término medio)"
                  value={item.notes}
                  onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                  className="h-8 w-full rounded-xl border border-[#E8E8E8] bg-white dark:bg-zinc-800 px-3 text-xs text-[#1A1A1A] dark:text-zinc-100 focus:border-[#1A1A1A] focus:outline-none"
                />
              </div>
            ))}

            {!cart.length && (
              <div className="py-8 text-center text-xs text-[#6B6B6B]">
                Agrega platos o bebidas para armar la orden.
              </div>
            )}
          </div>

          <div className="border-t border-[#E8E8E8] pt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1A1A1A]">Total:</span>
            <span className="text-2xl font-extrabold text-[#1A1A1A]">
              ${(cartTotalCents / 100).toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting || !cart.length || !selectedTable}
              onClick={() => void handleSubmitOrder(true)}
              className="h-14 w-full rounded-full bg-[#EAA228] hover:bg-[#D99318] text-sm font-black text-zinc-950 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 stroke-[2.2]" />
              <span>
                {isSubmitting
                  ? 'Procesando...'
                  : `Cobrar Ahora (Pre-pago) · Mesa #${selectedTable?.tableNumber || ''}`}
              </span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || !cart.length || !selectedTable}
              onClick={() => void handleSubmitOrder(false)}
              className="h-11 w-full rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting
                ? 'Guardando...'
                : 'Solo Enviar a Cocina (Cobrar al Final)'}
            </button>
          </div>
        </aside>
      </div>

      {/* Órdenes Recientes en este Dispositivo */}
      {recentOrders.length > 0 && (
        <section className="border-t border-[#E8E8E8] pt-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
            Órdenes recientes en este dispositivo ({recentOrders.length})
          </h3>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl border border-[#E8E8E8] bg-white p-4 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-[#1A1A1A]">Mesa #{ord.tableNumber}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      ord.isSynced
                        ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
                        : 'border-[#FFE6A5] bg-[#FFF8E7] text-[#9A6700]'
                    }`}
                  >
                    {ord.isSynced ? 'En servidor' : 'En cola local'}
                  </span>
                </div>

                <p className="text-[#6B6B6B]">
                  {ord.items.length} productos · Total: ${(ord.totalCents / 100).toFixed(2)}
                </p>
                <p className="text-[11px] text-[#A1A1AA]">
                  {new Date(ord.createdAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </p>

                <button
                  type="button"
                  onClick={() => setPrintingOrder(ord)}
                  className="mt-2 h-10 w-full rounded-full border border-[#E8E8E8] bg-white text-xs font-bold text-[#1A1A1A] hover:bg-[#F7F7F7] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Ticket térmico</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODAL DE IMPRESIÓN TÉRMICA */}
      {printingOrder && (
        <ThermalReceiptModal
          data={{
            orderNumber: printingOrder.id.slice(0, 8).toUpperCase(),
            tableOrToken: `Mesa #${printingOrder.tableNumber}`,
            dateTime: printingOrder.createdAt,
            items: printingOrder.items.map((it) => ({
              name: it.productName,
              quantity: it.quantity,
              priceCents: it.unitPriceCents,
              notes: it.notes,
            })),
            totalCents: printingOrder.totalCents,
            paymentStatus: printingOrder.status === 'pagada' ? 'pagado' : 'pendiente',
          }}
          onClose={() => setPrintingOrder(null)}
        />
      )}

      {/* MODAL DE COBRO DE CUENTA DE MESA (Cajero / Pre-pago / Cierre) */}
      {checkoutOrder && (
        <TableCheckoutModal
          order={checkoutOrder}
          initialKeepTableOccupied={true}
          onClose={() => setCheckoutOrder(null)}
          onSuccess={() => {
            const tableNum = checkoutOrder.tableNumber;
            setCheckoutOrder(null);
            setSelectedTable(null);
            setCart([]);
            setFeedback({
              ok: true,
              text: `Cobro de Mesa #${tableNum} registrado correctamente.`,
            });
            void loadData();
          }}
        />
      )}
      {/* Barra Flotante de Orden Actual en Móvil / Tablet */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 animate-in fade-in slide-in-from-bottom-3">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('waiter-active-order');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="w-full h-14 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-zinc-950 px-5 flex items-center justify-between shadow-2xl font-black text-sm border-2 border-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>
                {selectedTable ? `Mesa #${selectedTable.tableNumber}` : 'Orden'}: {cart.reduce((a, b) => a + b.quantity, 0)} platos
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-base">${(cartTotalCents / 100).toFixed(2)}</span>
              <span className="text-xs bg-black text-white px-3 py-1 rounded-full font-sans font-bold">
                Ver Comanda ↓
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
