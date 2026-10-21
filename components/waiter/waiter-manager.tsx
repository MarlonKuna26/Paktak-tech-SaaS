'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { offlineDb, type CachedProduct, type CachedTable, type LocalOrder } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { ThermalReceiptModal } from '@/components/orders/thermal-receipt-modal';

type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  notes: string;
};

export function WaiterManager({
  restaurantId,
  waiterId,
}: {
  restaurantId: string;
  waiterId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [batterySaver, setBatterySaver] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<LocalOrder | null>(null);

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
          .select('id, restaurant_id, category_id, name, description, price_cents, station, active')
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
        const formattedProducts: CachedProduct[] = productsData.map((p) => ({
          id: p.id,
          restaurantId: p.restaurant_id,
          categoryId: p.category_id,
          name: p.name,
          description: p.description,
          priceCents: p.price_cents,
          station: p.station,
          active: p.active,
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

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecentOrders(), 0);
    return () => window.clearTimeout(timer);
  }, [syncStatus.pendingCount, loadRecentOrders]);

  function addToCart(product: CachedProduct) {
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

  async function handleSubmitOrder() {
    setFeedback(null);

    if (!selectedTable) {
      setFeedback({ ok: false, text: 'Por favor selecciona una mesa antes de enviar la comanda.' });
      return;
    }
    if (!cart.length) {
      setFeedback({ ok: false, text: 'Agrega al menos un producto a la comanda.' });
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

      setCart([]);
      setIsSubmitting(false);
      setFeedback({
        ok: true,
        text: `Comanda de Mesa #${selectedTable.tableNumber} registrada exitosamente.`,
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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'todas' || p.station === categoryFilter;
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

      {/* 2. Catálogo y Comanda Activa */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Catálogo de Productos */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              2. Platos y bebidas {selectedTable && `(Mesa #${selectedTable.tableNumber})`}
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B6B6B]" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-full border border-[#E8E8E8] bg-white pl-9 pr-4 text-xs text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none"
                />
              </div>

              <div className="flex gap-1">
                {(['todas', 'cocina', 'barra'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`h-10 px-3.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                      categoryFilter === cat
                        ? 'bg-[#1A1A1A] text-white'
                        : 'border border-[#E8E8E8] bg-white text-[#1A1A1A] hover:bg-[#F7F7F7]'
                    }`}
                  >
                    {cat === 'todas' ? 'Todos' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filteredProducts.map((prod) => {
              const inCart = cart.find((it) => it.productId === prod.id);
              return (
                <article
                  key={prod.id}
                  className="flex flex-col justify-between rounded-[20px] border border-[#E8E8E8] bg-white p-4 transition-colors hover:border-[#1A1A1A]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-[#1A1A1A]">{prod.name}</h3>
                      <span className="font-mono text-sm font-extrabold text-[#1A1A1A]">
                        ${(prod.priceCents / 100).toFixed(2)}
                      </span>
                    </div>
                    {prod.description && (
                      <p className="mt-1 text-xs text-[#6B6B6B] line-clamp-2">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#E8E8E8] pt-3 text-xs">
                    <span className="text-[11px] font-semibold text-[#6B6B6B] capitalize">
                      {prod.station || 'Cocina'}
                    </span>

                    {inCart ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => changeQuantity(prod.id, inCart.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E8E8] bg-white text-[#1A1A1A] hover:bg-[#F7F7F7]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-extrabold text-xs">{inCart.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(prod.id, inCart.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E8E8] bg-white text-[#1A1A1A] hover:bg-[#F7F7F7]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(prod)}
                        className="h-9 px-3.5 rounded-full bg-[#FFC21A] text-xs font-extrabold text-[#1A1A1A] hover:opacity-90 transition-opacity"
                      >
                        + Agregar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {!filteredProducts.length && (
            <div className="rounded-[24px] border border-dashed border-[#E8E8E8] p-8 text-center text-sm text-[#6B6B6B]">
              No hay productos registrados en esta categoría.
            </div>
          )}
        </section>

        {/* Comanda Activa Lateral */}
        <aside className="h-fit rounded-[24px] border border-[#E8E8E8] bg-white p-5 lg:sticky lg:top-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
            <div>
              <h3 className="font-extrabold text-[#1A1A1A]">Comanda actual</h3>
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
                className="rounded-2xl border border-[#E8E8E8] bg-[#F7F7F7] p-3 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#1A1A1A]">{item.name}</span>
                  <span className="font-mono font-extrabold text-[#1A1A1A]">
                    ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#6B6B6B]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.productId, item.quantity - 1)}
                      className="h-7 w-7 rounded-full border border-[#E8E8E8] bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#F7F7F7]"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-extrabold text-[#1A1A1A]">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.productId, item.quantity + 1)}
                      className="h-7 w-7 rounded-full border border-[#E8E8E8] bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#F7F7F7]"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span>${(item.priceCents / 100).toFixed(2)} c/u</span>
                </div>

                <input
                  type="text"
                  placeholder="Instrucción (ej. sin cebolla, término medio)"
                  value={item.notes}
                  onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                  className="h-8 w-full rounded-xl border border-[#E8E8E8] bg-white px-3 text-xs text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none"
                />
              </div>
            ))}

            {!cart.length && (
              <div className="py-8 text-center text-xs text-[#6B6B6B]">
                Agrega platos o bebidas para armar la comanda.
              </div>
            )}
          </div>

          <div className="border-t border-[#E8E8E8] pt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1A1A1A]">Total:</span>
            <span className="text-2xl font-extrabold text-[#1A1A1A]">
              ${(cartTotalCents / 100).toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            disabled={isSubmitting || !cart.length || !selectedTable}
            onClick={() => void handleSubmitOrder()}
            className="h-14 w-full rounded-full bg-[#FFC21A] text-base font-extrabold text-[#1A1A1A] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting
              ? 'Guardando comanda...'
              : `Enviar comanda ${selectedTable ? `(Mesa #${selectedTable.tableNumber})` : ''}`}
          </button>
        </aside>
      </div>

      {/* Comandas Recientes en este Dispositivo */}
      {recentOrders.length > 0 && (
        <section className="border-t border-[#E8E8E8] pt-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
            Comandas recientes en este teléfono ({recentOrders.length})
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
    </div>
  );
}
