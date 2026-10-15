'use client';

import { useEffect, useState } from 'react';

type TrackedOrder = {
  id: string;
  tracking_code: string;
  status: string;
  rejection_reason: string | null;
  customer_name: string;
  total_cents: number;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; unit_price_cents: number; notes: string | null }>;
};

const labels: Record<string, string> = {
  pendiente: 'Recibido, esperando confirmación',
  confirmado: 'Confirmado por el restaurante',
  preparando: 'En preparación',
  listo: 'Listo',
  completado: 'Completado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

export function OrderTracker({ initialCode = '', initialPhone = '' }: { initialCode?: string; initialPhone?: string }) {
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState(initialPhone);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCode) return;
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem('paktak:last-order');
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as { code?: string; phone?: string };
        if (parsed.code) setCode(parsed.code);
        if (parsed.phone) setPhone(parsed.phone);
      } catch {
        localStorage.removeItem('paktak:last-order');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialCode]);

  async function searchOrder(nextCode = code, nextPhone = phone) {
    setLoading(true);
    setError('');
    const response = await fetch('/api/orders/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: nextCode, phone: nextPhone }),
    });
    const body = (await response.json()) as { order?: TrackedOrder; error?: string };
    setLoading(false);
    if (!response.ok || !body.order) {
      setOrder(null);
      setError(body.error ?? 'No encontramos el pedido.');
      return;
    }
    setOrder(body.order);
    localStorage.setItem('paktak:last-order', JSON.stringify({ code: nextCode, phone: nextPhone }));
  }

  return (
    <div className="space-y-5">
      <form onSubmit={(event) => { event.preventDefault(); void searchOrder(); }} className="rounded-xl border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código: PK-ABC123" className="h-11 rounded-md border bg-background px-3" />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Teléfono del pedido" type="tel" className="h-11 rounded-md border bg-background px-3" />
        </div>
        <button disabled={loading} className="mt-3 h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{loading ? 'Buscando...' : 'Consultar pedido'}</button>
      </form>
      {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {order && (
        <section className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Pedido {order.tracking_code}</p>
          <h2 className="mt-1 text-2xl font-semibold">{labels[order.status] ?? order.status}</h2>
          {order.rejection_reason && <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">Motivo: {order.rejection_reason}</p>}
          <ul className="mt-5 space-y-2 border-t pt-4 text-sm">
            {order.items.map((item) => <li key={`${item.product_name}-${item.quantity}`} className="flex justify-between"><span>{item.quantity} × {item.product_name}</span><span>${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}</span></li>)}
          </ul>
          <p className="mt-4 flex justify-between border-t pt-4 font-semibold"><span>Total</span><span>${(order.total_cents / 100).toFixed(2)}</span></p>
          <button onClick={() => void searchOrder()} className="mt-4 rounded-md border px-3 py-2 text-sm">Actualizar estado</button>
        </section>
      )}
    </div>
  );
}
