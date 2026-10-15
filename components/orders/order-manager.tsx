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
  public_order_items: Array<{
    product_name: string;
    quantity: number;
    unit_price_cents: number;
    notes: string | null;
  }>;
};

const statusBadges: Record<PublicOrder['status'], { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  confirmado: { label: 'Confirmado', className: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  preparando: { label: 'En Cocina', className: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  listo: { label: 'Listo para Entrega', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  completado: { label: 'Completado', className: 'bg-muted text-muted-foreground border-border' },
  rechazado: { label: 'Rechazado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelado: { label: 'Cancelado', className: 'bg-muted text-muted-foreground border-border' },
};

export function OrderManager({ restaurantId }: { restaurantId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'activos' | 'todos' | 'pendientes'>('activos');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    const { data, error: queryError } = await supabase
      .from('public_order_requests')
      .select('id,tracking_code,customer_name,customer_phone,notes,total_cents,status,rejection_reason,created_at,public_order_items(product_name,quantity,unit_price_cents,notes)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (!isSilent) setIsRefreshing(false);

    if (queryError) {
      setError('No se pudieron cargar los pedidos en tiempo real.');
    } else {
      setOrders((data ?? []) as PublicOrder[]);
    }
  }, [restaurantId, supabase]);

  // Carga inicial y polling periódico cada 5 segundos
  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function transition(id: string, status: 'confirmado' | 'preparando' | 'listo' | 'completado', reason?: string) {
    setError('');
    const response = await fetch(`/api/orders/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? 'No se pudo actualizar el estado del pedido.');
      return;
    }
    await load();
  }

  async function confirmReject(orderId: string) {
    if (!rejectReason.trim() || rejectReason.trim().length < 3) {
      setError('Por favor indica un motivo claro para el rechazo (mínimo 3 caracteres).');
      return;
    }
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rechazado', reason: rejectReason.trim() }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? 'No se pudo rechazar el pedido.');
      return;
    }
    setRejectingOrderId(null);
    setRejectReason('');
    await load();
  }

  const filteredOrders = useMemo(() => {
    if (filter === 'pendientes') {
      return orders.filter((o) => o.status === 'pendiente');
    }
    if (filter === 'activos') {
      return orders.filter((o) => ['pendiente', 'confirmado', 'preparando', 'listo'].includes(o.status));
    }
    return orders;
  }, [orders, filter]);

  const pendingCount = orders.filter((o) => o.status === 'pendiente').length;

  function buildWhatsAppMessage(order: PublicOrder): string {
    const cleanPhone = order.customer_phone.replace(/\D/g, '');
    let text = `Hola ${order.customer_name}, le contactamos de Paktak sobre su pedido ${order.tracking_code}.`;
    if (order.status === 'confirmado') {
      text = `Hola ${order.customer_name}, su pedido ${order.tracking_code} ha sido confirmado y está pasando a preparación. 🍽️`;
    } else if (order.status === 'listo') {
      text = `Hola ${order.customer_name}, ¡su pedido ${order.tracking_code} está LISTO! Ya puede retirarlo. ¡Buen provecho! 🎉`;
    } else if (order.status === 'rechazado') {
      text = `Hola ${order.customer_name}, lamentamos informarle que su pedido ${order.tracking_code} no pudo ser atendido. Motivo: ${order.rejection_reason || 'Sin stock disponible'}.`;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="space-y-5">
      {/* Barra de control y filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('activos')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === 'activos'
                ? 'bg-primary text-primary-foreground'
                : 'border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            En Curso ({orders.filter((o) => ['pendiente', 'confirmado', 'preparando', 'listo'].includes(o.status)).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pendientes')}
            className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === 'pendientes'
                ? 'bg-primary text-primary-foreground'
                : 'border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            Pendientes
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter('todos')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === 'todos'
                ? 'bg-primary text-primary-foreground'
                : 'border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            Historial ({orders.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Sincronizado cada 5s
          </span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={isRefreshing}
            className="rounded-lg border bg-background px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {isRefreshing ? 'Actualizando...' : '↻ Refrescar'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Lista de Pedidos */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const badge = statusBadges[order.status];
          return (
            <article
              key={order.id}
              className={`rounded-xl border bg-card p-5 transition-all ${
                order.status === 'pendiente' ? 'border-amber-400/60 shadow-sm' : ''
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                {/* Información del Cliente y Pedido */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-wider text-primary">
                      {order.tracking_code}
                    </span>
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">{order.customer_name}</h3>
                    <p className="text-xs text-muted-foreground">Teléfono: {order.customer_phone}</p>
                  </div>

                  {/* Lista de Items */}
                  <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                    <p className="font-semibold text-muted-foreground uppercase mb-1">Productos:</p>
                    <ul className="space-y-1">
                      {order.public_order_items.map((item, idx) => (
                        <li key={`${order.id}-${idx}`} className="flex justify-between">
                          <span>
                            <strong>{item.quantity}×</strong> {item.product_name}
                            {item.notes && <em className="text-muted-foreground ml-1">({item.notes})</em>}
                          </span>
                          <span className="font-mono">
                            ${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 border-t pt-1.5 flex justify-between font-bold text-sm">
                      <span>Total:</span>
                      <span className="text-primary">${(order.total_cents / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {order.notes && (
                    <p className="rounded-lg bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
                      <strong>Nota del cliente:</strong> {order.notes}
                    </p>
                  )}

                  {order.rejection_reason && (
                    <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                      <strong>Motivo de rechazo:</strong> {order.rejection_reason}
                    </p>
                  )}
                </div>

                {/* Acciones de Cocina y Notificación */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                  {order.status === 'pendiente' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void transition(order.id, 'confirmado')}
                        className="h-9 w-full rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        ✓ Confirmar Pedido
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingOrderId(order.id);
                          setRejectReason('');
                        }}
                        className="h-9 w-full rounded-lg border border-destructive/30 px-3 text-xs font-medium text-destructive hover:bg-destructive/10"
                      >
                        ✕ Rechazar
                      </button>
                    </>
                  )}

                  {order.status === 'confirmado' && (
                    <button
                      type="button"
                      onClick={() => void transition(order.id, 'preparando')}
                      className="h-9 w-full rounded-lg bg-orange-500 px-3 text-xs font-semibold text-white hover:bg-orange-600"
                    >
                      🍳 Enviar a Cocina
                    </button>
                  )}

                  {order.status === 'preparando' && (
                    <button
                      type="button"
                      onClick={() => void transition(order.id, 'listo')}
                      className="h-9 w-full rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      🔔 Marcar como ¡Listo!
                    </button>
                  )}

                  {order.status === 'listo' && (
                    <button
                      type="button"
                      onClick={() => void transition(order.id, 'completado')}
                      className="h-9 w-full rounded-lg border bg-background px-3 text-xs font-semibold hover:bg-muted"
                    >
                      ✓ Entregado y Cerrar
                    </button>
                  )}

                  {/* Botón WhatsApp */}
                  <a
                    href={buildWhatsAppMessage(order)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-xs font-medium text-white hover:opacity-90 shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Avisar por WhatsApp
                  </a>

                  {/* Panel inline para rechazar */}
                  {rejectingOrderId === order.id && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2 mt-2">
                      <p className="text-xs font-semibold text-destructive">Motivo del rechazo:</p>
                      <input
                        type="text"
                        placeholder="Ej. Sin insumos / cerrado"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="h-8 w-full rounded border bg-background px-2 text-xs focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void confirmReject(order.id)}
                          className="h-7 flex-1 rounded bg-destructive px-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingOrderId(null)}
                          className="h-7 rounded border px-2 text-xs hover:bg-muted"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!filteredOrders.length && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No hay pedidos en esta sección.
          </div>
        )}
      </div>
    </div>
  );
}
