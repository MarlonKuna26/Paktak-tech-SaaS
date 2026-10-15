'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CartItem, PublicMenuProduct } from '@/lib/orders/types';

export function PublicOrderForm({
  restaurantSlug,
  products,
}: {
  restaurantSlug: string;
  products: PublicMenuProduct[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
    [cart],
  );

  function addProduct(product: PublicMenuProduct) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => item.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, 99) }
          : item);
      }
      return [...current, { ...product, quantity: 1, notes: '' }];
    });
  }

  function changeQuantity(id: string, quantity: number) {
    setCart((current) => quantity < 1
      ? current.filter((item) => item.id !== id)
      : current.map((item) => item.id === id ? { ...item, quantity: Math.min(quantity, 99) } : item));
  }

  async function submitOrder() {
    setResult(null);
    if (!customerName.trim() || !customerPhone.trim() || !cart.length) {
      setResult({ ok: false, text: 'Completa tus datos y agrega productos al carrito.' });
      return;
    }
    setIsSubmitting(true);
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantSlug,
        customerName,
        customerPhone,
        notes,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity, notes: item.notes })),
      }),
    });
    const body = (await response.json()) as { message?: string; error?: string; tracking?: { tracking_code: string; tracking_token: string } };
    setIsSubmitting(false);
    if (!response.ok) {
      setResult({ ok: false, text: body.error ?? 'No se pudo enviar el pedido.' });
      return;
    }
    setCart([]);
    if (body.tracking) {
      const trackingUrl = `${window.location.origin}/pedido/${body.tracking.tracking_token}`;
      localStorage.setItem('paktak:last-order', JSON.stringify({ code: body.tracking.tracking_code, phone: customerPhone }));
      router.push(trackingUrl);
    } else {
      setResult({ ok: true, text: body.message ?? 'Pedido recibido.' });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Menú</h2>
        {products.map((product) => (
          <article key={product.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
            <div>
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.description || 'Sin descripción'}</p>
              <p className="mt-1 font-semibold">${(product.price_cents / 100).toFixed(2)}</p>
            </div>
            <button onClick={() => addProduct(product)} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Agregar</button>
          </article>
        ))}
      </section>
      <aside className="h-fit rounded-xl border bg-card p-5 lg:sticky lg:top-4">
        <h2 className="mb-4 text-xl font-semibold">Tu pedido</h2>
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.id} className="border-b pb-3">
              <div className="flex justify-between gap-2 text-sm">
                <span>{item.name}</span>
                <span>${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => changeQuantity(item.id, item.quantity - 1)} className="rounded border px-2">−</button>
                <span>{item.quantity}</span>
                <button onClick={() => changeQuantity(item.id, item.quantity + 1)} className="rounded border px-2">+</button>
              </div>
            </div>
          ))}
          {!cart.length && <p className="text-sm text-muted-foreground">Tu carrito está vacío.</p>}
        </div>
        <p className="mt-4 flex justify-between border-t pt-4 font-semibold"><span>Total estimado</span><span>${(total / 100).toFixed(2)}</span></p>
        <div className="mt-5 space-y-3">
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Tu nombre" className="h-11 w-full rounded-md border bg-background px-3" />
          <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Tu teléfono" type="tel" className="h-11 w-full rounded-md border bg-background px-3" />
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas del pedido (opcional)" rows={3} className="w-full rounded-md border bg-background px-3 py-2" />
          {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'rounded-md bg-primary/10 p-3 text-sm text-primary' : 'rounded-md bg-destructive/10 p-3 text-sm text-destructive'}>{result.text}</p>}
          <button onClick={() => void submitOrder()} disabled={isSubmitting || !cart.length} className="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{isSubmitting ? 'Enviando...' : 'Enviar pedido'}</button>
        </div>
      </aside>
    </div>
  );
}
