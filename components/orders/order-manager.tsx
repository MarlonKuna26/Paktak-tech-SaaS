'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type PublicOrder = {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  total_cents: number;
  status: 'pendiente' | 'confirmado' | 'rechazado' | 'preparando' | 'listo' | 'completado' | 'cancelado';
  rejection_reason: string | null;
  created_at: string;
  public_order_items: Array<{ product_name: string; quantity: number; unit_price_cents: number; notes: string | null }>;
};

export function OrderManager({ restaurantId }: { restaurantId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('public_order_requests')
      .select('id,tracking_code,customer_name,customer_phone,notes,total_cents,status,rejection_reason,created_at,public_order_items(product_name,quantity,unit_price_cents,notes)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (queryError) setError('No se pudieron cargar los pedidos.');
    else setOrders((data ?? []) as PublicOrder[]);
  }, [restaurantId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function transition(id: string, status: 'confirmado' | 'preparando' | 'listo' | 'completado', reason?: string) {
    const response = await fetch(`/api/orders/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? 'No se pudo actualizar el pedido.');
      return;
    }
    await load();
  }

  async function rejectOrder(order: PublicOrder) {
    const reason = window.prompt('Escribe el motivo del rechazo:')?.trim();
    if (!reason) {
      setError('Debes indicar un motivo para rechazar el pedido.');
      return;
    }
    const response = await fetch(`/api/orders/${order.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rechazado', reason }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? 'No se pudo rechazar el pedido.');
      return;
    }
    await load();
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {orders.map((order) => (
        <article key={order.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:justify-between">
            <div>
              <h2 className="font-semibold">{order.customer_name} · ${(order.total_cents / 100).toFixed(2)}</h2>
              <p className="text-sm text-muted-foreground">Código {order.tracking_code} · {order.customer_phone} · {new Date(order.created_at).toLocaleString('es-EC')}</p>
              <ul className="mt-2 text-sm">{order.public_order_items.map((item) => <li key={`${order.id}-${item.product_name}`}>{item.quantity} × {item.product_name}</li>)}</ul>
              {order.notes && <p className="mt-2 text-sm">{order.notes}</p>}
              {order.rejection_reason && <p className="mt-2 text-sm text-destructive">Motivo: {order.rejection_reason}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {order.status === 'pendiente' && <>
                <button onClick={() => void transition(order.id, 'confirmado')} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Confirmar pedido</button>
                <button onClick={() => void rejectOrder(order)} className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">Rechazar pedido</button>
              </>}
              {order.status === 'confirmado' && <button onClick={() => void transition(order.id, 'preparando')} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Enviar a cocina</button>}
              {order.status === 'preparando' && <button onClick={() => void transition(order.id, 'listo')} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Marcar como listo</button>}
              {order.status === 'listo' && <button onClick={() => void transition(order.id, 'completado')} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Marcar como completado</button>}
              <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-2 text-sm">WhatsApp</a>
            </div>
          </div>
        </article>
      ))}
      {!orders.length && <p className="text-sm text-muted-foreground">No hay pedidos públicos.</p>}
    </div>
  );
}
