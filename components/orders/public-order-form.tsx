'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CartItem, PublicMenuProduct } from '@/lib/orders/types';
import {
  getActiveOrder,
  getSavedCart,
  getSavedCustomerInfo,
  saveActiveOrder,
  saveCart,
  clearCart,
  saveCustomerInfo,
  type StoredActiveOrder,
} from '@/lib/orders/session';

export function PublicOrderForm({
  restaurantSlug,
  products,
}: {
  restaurantSlug: string;
  products: PublicMenuProduct[];
}) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [activeOrder, setActiveOrder] = useState<StoredActiveOrder | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedCart = getSavedCart<CartItem>(restaurantSlug);
      if (savedCart.length > 0) {
        setCart(savedCart);
      }
      const customer = getSavedCustomerInfo();
      if (customer) {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
      }
      const active = getActiveOrder();
      if (active) {
        setActiveOrder(active);
      }
      setIsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [restaurantSlug]);

  // Persist cart whenever it changes (after initial hydration)
  useEffect(() => {
    if (!isHydrated) return;
    saveCart(restaurantSlug, cart);
  }, [cart, isHydrated, restaurantSlug]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
    [cart],
  );

  function addProduct(product: PublicMenuProduct) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, 99) }
            : item,
        );
      }
      return [...current, { ...product, quantity: 1, notes: '' }];
    });
  }

  function changeQuantity(id: string, quantity: number) {
    setCart((current) =>
      quantity < 1
        ? current.filter((item) => item.id !== id)
        : current.map((item) =>
            item.id === id ? { ...item, quantity: Math.min(quantity, 99) } : item,
          ),
    );
  }

  function updateItemNotes(id: string, itemNotes: string) {
    setCart((current) =>
      current.map((item) =>
        item.id === id ? { ...item, notes: itemNotes.slice(0, 150) } : item,
      ),
    );
  }

  async function submitOrder() {
    setResult(null);
    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();

    if (!cleanName || cleanName.length < 2) {
      setResult({ ok: false, text: 'Por favor ingresa un nombre válido (al menos 2 caracteres).' });
      return;
    }
    if (!cleanPhone || cleanPhone.length < 7) {
      setResult({ ok: false, text: 'Por favor ingresa un número de teléfono válido (mínimo 7 dígitos).' });
      return;
    }
    if (!cart.length) {
      setResult({ ok: false, text: 'Agrega al menos un producto a tu carrito.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug,
          customerName: cleanName,
          customerPhone: cleanPhone,
          notes: notes.trim() || undefined,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            notes: item.notes || undefined,
          })),
        }),
      });

      const body = (await response.json()) as {
        message?: string;
        error?: string;
        tracking?: { id: string; tracking_code: string; tracking_token: string };
      };

      setIsSubmitting(false);

      if (!response.ok) {
        setResult({ ok: false, text: body.error ?? 'No se pudo enviar el pedido. Intenta nuevamente.' });
        return;
      }

      // 1. Guardar info del cliente para próximas compras
      saveCustomerInfo(cleanName, cleanPhone);

      // 2. Limpiar el carrito guardado
      clearCart(restaurantSlug);
      setCart([]);

      // 3. Si devolvió tracking, guardar la sesión activa del pedido
      if (body.tracking) {
        const orderSession: StoredActiveOrder = {
          id: body.tracking.id,
          trackingCode: body.tracking.tracking_code,
          trackingToken: body.tracking.tracking_token,
          phone: cleanPhone,
          customerName: cleanName,
          restaurantSlug,
          totalCents: total,
          status: 'pendiente',
          createdAt: new Date().toISOString(),
        };
        saveActiveOrder(orderSession);

        // 4. Redirigir al cliente a su pantalla de seguimiento en vivo
        const trackingUrl = `/pedido/${body.tracking.tracking_token}`;
        router.push(trackingUrl);
      } else {
        setResult({ ok: true, text: body.message ?? 'Pedido recibido con éxito.' });
      }
    } catch {
      setIsSubmitting(false);
      setResult({
        ok: false,
        text: 'Error de red o conexión. Por favor verifica tu internet e intenta nuevamente.',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner de pedido activo existente */}
      {activeOrder && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary"></span>
              </span>
              <p className="text-sm font-semibold text-primary">Tienes un pedido en curso</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Código: <strong className="text-foreground">{activeOrder.trackingCode}</strong> a nombre de{' '}
              {activeOrder.customerName}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/pedido/${activeOrder.trackingToken}`}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ver estado en vivo
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Catálogo de Productos */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Menú Disponible</h2>
            <span className="text-xs text-muted-foreground">{products.length} productos</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => {
              const inCart = cart.find((item) => item.id === product.id);
              return (
                <article
                  key={product.id}
                  className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      <span className="font-bold text-primary">
                        ${(product.price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {product.description || 'Sin descripción detallada'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      {product.station === 'barra' ? '🥤 Bebida / Barra' : '🍳 Cocina'}
                    </span>
                    {inCart ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => changeQuantity(product.id, inCart.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border text-sm font-medium hover:bg-muted"
                          title="Restar uno"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">
                          {inCart.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(product.id, inCart.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border text-sm font-medium hover:bg-muted"
                          title="Agregar uno más"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        + Agregar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {!products.length && (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              No hay productos disponibles en este momento.
            </div>
          )}
        </section>

        {/* Sidebar del Carrito Persistente */}
        <aside className="h-fit rounded-xl border bg-card p-5 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-lg font-semibold">Tu Carrito</h2>
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

          <div className="mt-3 max-h-[300px] space-y-3 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.id} className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-semibold">
                    ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, item.quantity - 1)}
                      className="h-6 w-6 rounded border bg-background text-center hover:bg-muted"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, item.quantity + 1)}
                      className="h-6 w-6 rounded border bg-background text-center hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                  <span>${(item.price_cents / 100).toFixed(2)} c/u</span>
                </div>

                <input
                  type="text"
                  placeholder="Nota (ej. sin cebolla)"
                  value={item.notes}
                  onChange={(e) => updateItemNotes(item.id, e.target.value)}
                  className="mt-1 h-7 w-full rounded border bg-background px-2 text-[11px] placeholder:text-muted-foreground/60"
                />
              </div>
            ))}

            {!cart.length && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p>Tu carrito está vacío.</p>
                <p className="mt-1 text-xs">Selecciona productos del menú para comenzar.</p>
              </div>
            )}
          </div>

          <div className="mt-4 border-t pt-3">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total Estimado:</span>
              <span className="text-primary">${(total / 100).toFixed(2)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Pago directo en el restaurante (Efectivo o Transferencia).
            </p>
          </div>

          {/* Formulario de Datos del Cliente */}
          <div className="mt-5 space-y-3">
            <div>
              <label htmlFor="customerName" className="block text-xs font-medium text-muted-foreground mb-1">
                Tu Nombre y Apellido *
              </label>
              <input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label htmlFor="customerPhone" className="block text-xs font-medium text-muted-foreground mb-1">
                Teléfono de Contacto (WhatsApp) *
              </label>
              <input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ej. 0991234567"
                type="tel"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label htmlFor="orderNotes" className="block text-xs font-medium text-muted-foreground mb-1">
                Instrucciones Generales (Opcional)
              </label>
              <textarea
                id="orderNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Para llevar, cubiertos por favor..."
                rows={2}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {result && (
              <div
                role={result.ok ? 'status' : 'alert'}
                className={
                  result.ok
                    ? 'rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary'
                    : 'rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'
                }
              >
                {result.text}
              </div>
            )}

            <button
              type="button"
              onClick={() => void submitOrder()}
              disabled={isSubmitting || !cart.length}
              className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Enviando pedido...
                </span>
              ) : (
                `Confirmar y Enviar Pedido ($${(total / 100).toFixed(2)})`
              )}
            </button>

            <p className="text-center text-[10px] text-muted-foreground">
              Al recargar la página tu carrito y datos no se perderán.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
