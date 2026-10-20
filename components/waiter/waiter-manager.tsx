'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
    // A) Primero intentar cargar desde la red si hay conexión
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
      // B) Si la red falla o está offline, cargar desde la base de datos local Dexie
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

  // Actualizar lista de órdenes cuando cambie el conteo de sincronización
  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecentOrders(), 0);
    return () => window.clearTimeout(timer);
  }, [syncStatus.pendingCount, loadRecentOrders]);

  // Carrito helpers
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

  // 3. Enviar Comanda (Offline-First garantizado)
  async function handleSubmitOrder() {
    setFeedback(null);

    // Validaciones básicas
    if (!selectedTable) {
      setFeedback({ ok: false, text: 'Por favor selecciona una mesa antes de enviar.' });
      return;
    }
    if (!cart.length) {
      setFeedback({ ok: false, text: 'Agrega al menos un producto a la comanda.' });
      return;
    }

    setIsSubmitting(true);

    // A) Generar UUIDs deterministas en el cliente
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
      // B) Guardar orden inmediatamente en Dexie localOrders
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

      // C) Encolar la mutación en Dexie Outbox
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

      // D) Limpiar estado y dar feedback inmediato al mesero
      setCart([]);
      setIsSubmitting(false);
      setFeedback({
        ok: true,
        text: `Comanda para Mesa #${selectedTable.tableNumber} registrada (${syncStatus.isOnline ? 'enviada a cocina' : 'guardada en este dispositivo'}).`,
      });
      await loadRecentOrders();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setFeedback({
        ok: false,
        text: 'Error inesperado al guardar la comanda localmente.',
      });
    }
  }

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'todas' || p.station === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, categoryFilter]);

  return (
    <div className="space-y-5">
      {/* Indicador Permanente de Conexión (Outbox Status) */}
      <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {syncStatus.isOnline ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                🟢 En Línea (Sincronizado)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                🔴 Sin Conexión (Modo Offline Activo)
              </span>
            </div>
          )}

          {syncStatus.pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
              ⏳ {syncStatus.pendingCount} en cola local
            </span>
          )}

          {syncStatus.isSyncing && (
            <span className="text-xs text-muted-foreground animate-pulse">Sincronizando con el servidor...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {syncStatus.lastSyncedAt && (
            <span className="text-[11px] text-muted-foreground">
              Último sync: {syncStatus.lastSyncedAt.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => setBatterySaver(!batterySaver)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              batterySaver
                ? 'bg-amber-400 text-black border border-amber-300'
                : 'border bg-background hover:bg-muted text-muted-foreground'
            }`}
            title="Activa el fondo negro absoluto (AMOLED) para ahorrar hasta 45% de batería en apagones"
          >
            {batterySaver ? '⚡ Modo Apagón ON' : '🔋 Ahorro Apagón'}
          </button>
          <button
            type="button"
            onClick={() => void syncEngine.checkConnectionAndSync()}
            className="rounded-lg border bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
          >
            ↻ Sincronizar Ahora
          </button>
          {/* Botón para ver comanda visual (modo apagón) */}
          <button
            type="button"
            onClick={() => printingOrder && setPrintingOrder(printingOrder)}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/80"
          >
            📄 Mostrar Comanda (Modo Apagón)
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.ok ? 'status' : 'alert'}
          className={`rounded-xl border p-4 text-sm font-medium ${
            feedback.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Selector de Mesa */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          1. Selecciona la Mesa
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {tables.map((table) => {
            const isSelected = selectedTable?.id === table.id;
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => setSelectedTable(table)}
                className={`flex min-w-[90px] flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-md scale-105'
                    : table.status === 'ocupada'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      : 'border-border bg-card hover:border-primary/50 text-foreground'
                }`}
              >
                <span className="text-xs font-medium opacity-80">{table.zone || 'Salón'}</span>
                <span className="text-lg font-extrabold">Mesa #{table.tableNumber}</span>
                <span className="text-[10px] mt-0.5 opacity-90 capitalize">
                  {isSelected ? 'Seleccionada' : table.status}
                </span>
              </button>
            );
          })}

          {!tables.length && (
            <p className="text-xs text-muted-foreground py-2">
              No hay mesas cargadas. Ve a /admin/mesas para crear mesas.
            </p>
          )}
        </div>
      </section>

      {/* Interfaz de Pedido: Catálogo + Comanda Activa */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Catálogo de Productos */}
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              2. Agregar Productos al Pedido {selectedTable && `(Mesa #${selectedTable.tableNumber})`}
            </h2>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar plato o bebida..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-lg border bg-background px-3 text-xs focus:outline-none"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-lg border bg-background px-2 text-xs focus:outline-none"
              >
                <option value="todas">Todos</option>
                <option value="cocina">🍳 Cocina</option>
                <option value="barra">🥤 Barra</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filteredProducts.map((prod) => {
              const inCart = cart.find((it) => it.productId === prod.id);
              return (
                <article
                  key={prod.id}
                  className="flex flex-col justify-between rounded-xl border bg-card p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-bold">{prod.name}</h3>
                      <span className="font-mono text-xs font-extrabold text-primary">
                        ${(prod.priceCents / 100).toFixed(2)}
                      </span>
                    </div>
                    {prod.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      {prod.station === 'barra' ? '🥤 Barra' : '🍳 Cocina'}
                    </span>

                    {inCart ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => changeQuantity(prod.id, inCart.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border bg-background text-xs font-bold hover:bg-muted"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-bold text-xs">{inCart.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(prod.id, inCart.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border bg-background text-xs font-bold hover:bg-muted"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(prod)}
                        className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90"
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
            <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              No hay productos que coincidan con la búsqueda.
            </div>
          )}
        </section>

        {/* Sidebar de la Comanda Activa */}
        <aside className="h-fit rounded-2xl border bg-card p-4 shadow-sm lg:sticky lg:top-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="font-bold">Comanda Actual</h3>
              <p className="text-xs text-muted-foreground">
                {selectedTable ? `Mesa #${selectedTable.tableNumber}` : 'Selecciona una mesa'}
              </p>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Lista de Items */}
          <div className="max-h-[280px] space-y-2.5 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.productId} className="rounded-xl border bg-muted/20 p-2.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{item.name}</span>
                  <span className="font-mono font-bold">
                    ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.productId, item.quantity - 1)}
                      className="h-5 w-5 rounded border bg-background text-center hover:bg-muted"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold text-foreground">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.productId, item.quantity + 1)}
                      className="h-5 w-5 rounded border bg-background text-center hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                  <span>${(item.priceCents / 100).toFixed(2)} c/u</span>
                </div>

                <input
                  type="text"
                  placeholder="Nota (ej. sin cebolla, salsa aparte)"
                  value={item.notes}
                  onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                  className="h-6 w-full rounded border bg-background px-2 text-[11px]"
                />
              </div>
            ))}

            {!cart.length && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Agrega platos o bebidas para armar la comanda.
              </div>
            )}
          </div>

          <div className="border-t pt-3 flex items-center justify-between font-bold text-base">
            <span>Total Comanda:</span>
            <span className="text-primary font-mono">${(cartTotalCents / 100).toFixed(2)}</span>
          </div>

          <button
            type="button"
            disabled={isSubmitting || !cart.length || !selectedTable}
            onClick={() => void handleSubmitOrder()}
            className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting
              ? 'Guardando...'
              : `Enviar Comanda ${selectedTable ? `(Mesa #${selectedTable.tableNumber})` : ''}`}
          </button>
        </aside>
      </div>

      {/* Historial de Comandas del Teléfono (IndexedDB) */}
      {recentOrders.length > 0 && (
        <section className="mt-8 border-t pt-5 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Comandas Recientes en este Dispositivo ({recentOrders.length})
          </h3>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {recentOrders.map((ord) => (
              <div key={ord.id} className="rounded-xl border bg-card p-3 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Mesa #{ord.tableNumber}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      ord.isSynced
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 animate-pulse'
                    }`}
                  >
                    {ord.isSynced ? '✓ En Servidor' : '⏳ En Cola Local'}
                  </span>
                </div>

                <p className="text-muted-foreground">
                  {ord.items.length} items · Total: ${(ord.totalCents / 100).toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(ord.createdAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </p>

                <button
                  type="button"
                  onClick={() => setPrintingOrder(ord)}
                  className="mt-2 h-7 w-full rounded-lg border bg-background text-[11px] font-semibold hover:bg-muted flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>🖨️</span> Ticket Térmico / Cocina
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODAL DE IMPRESIÓN TÉRMICA & COMANDA COCINA */}
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
