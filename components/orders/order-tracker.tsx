'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  getActiveOrder,
  getSavedCustomerInfo,
  saveActiveOrder,
  saveCustomerInfo,
} from '@/lib/orders/session';

type TrackedOrder = {
  id: string;
  tracking_code: string;
  status: 'pendiente' | 'confirmado' | 'preparando' | 'listo' | 'completado' | 'rechazado' | 'cancelado';
  service_type?: 'paleta_madera' | 'mesa_fija' | 'para_llevar';
  table_or_token_number?: string | null;
  payment_status?: 'pendiente' | 'pagado';
  payment_method?: string | null;
  rejection_reason: string | null;
  customer_name: string;
  total_cents: number;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price_cents: number;
    notes: string | null;
  }>;
};

const statusMeta: Record<
  TrackedOrder['status'],
  { label: string; step: number; color: string; desc: string }
> = {
  pendiente: {
    label: 'Recibido',
    step: 1,
    color: 'bg-amber-500',
    desc: 'Tu pedido ha llegado al restaurante. Esperando que el equipo lo confirme.',
  },
  confirmado: {
    label: 'Confirmado',
    step: 2,
    color: 'bg-blue-500',
    desc: 'El restaurante ha aceptado tu pedido e iniciará su preparación.',
  },
  preparando: {
    label: 'En Preparación',
    step: 3,
    color: 'bg-orange-500',
    desc: 'Tu comida está en cocina siendo preparada por el chef.',
  },
  listo: {
    label: '¡Listo!',
    step: 4,
    color: 'bg-emerald-500',
    desc: 'Tu pedido está listo para ser retirado o entregado.',
  },
  completado: {
    label: 'Completado',
    step: 5,
    color: 'bg-emerald-600',
    desc: 'Este pedido ha sido entregado exitosamente. ¡Buen provecho!',
  },
  rechazado: {
    label: 'No disponible / Rechazado',
    step: 0,
    color: 'bg-destructive',
    desc: 'El restaurante no pudo atender este pedido en este momento.',
  },
  cancelado: {
    label: 'Cancelado',
    step: 0,
    color: 'bg-muted-foreground',
    desc: 'Este pedido fue cancelado.',
  },
};

export function OrderTracker({
  initialCode = '',
  initialPhone = '',
}: {
  initialCode?: string;
  initialPhone?: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState(initialPhone);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Mantener referencia del polling para evitar memory leaks
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar datos guardados en localStorage al iniciar
  const searchOrder = useCallback(
    async (targetCode: string, targetPhone: string, isSilent = false) => {
      const cleanCode = targetCode.trim();
      const cleanPhone = targetPhone.trim();

      if (!cleanCode || !cleanPhone) {
        if (!isSilent) {
          setError('Ingresa el código del pedido y tu número de teléfono.');
        }
        return;
      }

      if (!isSilent) {
        setLoading(true);
        setError('');
      }

      try {
        const response = await fetch('/api/orders/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cleanCode, phone: cleanPhone }),
        });

        const body = (await response.json()) as { order?: TrackedOrder; error?: string };

        if (!response.ok || !body.order) {
          if (!isSilent) {
            setOrder(null);
            setError(body.error ?? 'No encontramos un pedido con esos datos. Verifica el código y teléfono.');
          }
          return;
        }

        setOrder(body.order);
        setLastUpdated(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        // Guardar sesión activa confirmada
        saveCustomerInfo(body.order.customer_name, cleanPhone);
        const existingActive = getActiveOrder();
        saveActiveOrder({
          id: body.order.id,
          trackingCode: body.order.tracking_code,
          trackingToken: existingActive?.trackingToken || cleanCode,
          phone: cleanPhone,
          customerName: body.order.customer_name,
          restaurantSlug: existingActive?.restaurantSlug || '',
          totalCents: body.order.total_cents,
          status: body.order.status,
          createdAt: body.order.created_at,
        });
      } catch {
        if (!isSilent) {
          setError('Error de conexión al consultar el estado.');
        }
      } finally {
        if (!isSilent) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let effectiveCode = initialCode;
      let effectivePhone = initialPhone;

      const active = getActiveOrder();
      const customer = getSavedCustomerInfo();

      if (!effectiveCode && active?.trackingCode) {
        effectiveCode = active.trackingCode;
        setCode(active.trackingCode);
      }
      if (!effectivePhone) {
        const storedPhone = active?.phone || customer?.phone || '';
        if (storedPhone) {
          effectivePhone = storedPhone;
          setPhone(storedPhone);
        }
      }

      // Si ya tenemos código y teléfono, buscar automáticamente
      if (effectiveCode && effectivePhone) {
        void searchOrder(effectiveCode, effectivePhone, false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialCode, initialPhone, searchOrder]);

  // Polling automático cada 5 segundos si el pedido está activo (no completado ni cancelado)
  useEffect(() => {
    if (!order) return;
    const isFinished = order.status === 'completado' || order.status === 'rechazado' || order.status === 'cancelado';
    if (isFinished) return;

    pollingRef.current = setInterval(() => {
      void searchOrder(code, phone, true);
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [order, code, phone, searchOrder]);

  function copyTrackingLink() {
    if (typeof window === 'undefined') return;
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const currentMeta = order ? statusMeta[order.status] : null;

  return (
    <div className="space-y-6">
      {/* Si aún no hay pedido cargado o el usuario quiere buscar otro */}
      {(!order || !initialCode) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void searchOrder(code, phone, false);
          }}
          className="rounded-xl border bg-card p-5 shadow-sm"
        >
          <h2 className="mb-3 text-base font-semibold">Consultar pedido</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="searchCode" className="mb-1 block text-xs font-medium text-muted-foreground">
                Código del Pedido o Enlace
              </label>
              <input
                id="searchCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. PK-ABC123"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase"
              />
            </div>
            <div>
              <label htmlFor="searchPhone" className="mb-1 block text-xs font-medium text-muted-foreground">
                Teléfono del Pedido (seguridad)
              </label>
              <input
                id="searchPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 0991234567"
                type="tel"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Consultando...' : 'Ver Estado del Pedido'}
            </button>
            <p className="text-xs text-muted-foreground">
              Tus datos se guardan para que no tengas que escribirlos de nuevo al recargar.
            </p>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-xs opacity-90">Verifica que hayas escrito el mismo teléfono con el que realizaste el pedido.</p>
        </div>
      )}

      {/* Pantalla de Seguimiento Activa del Pedido */}
      {order && currentMeta && (
        <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
          {/* Encabezado y Live Indicator */}
          <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-wider text-primary">
                  {order.tracking_code}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">{currentMeta.label}</h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                En vivo {lastUpdated && `(${lastUpdated})`}
              </span>
              <button
                type="button"
                onClick={() => void searchOrder(code, phone, false)}
                className="h-8 rounded-md border px-2.5 text-xs font-medium hover:bg-muted"
                title="Actualizar manualmente"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Banner de Paleta / Mesa y Estado de Pago */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {order.service_type === 'paleta_madera' ? '🪵' : order.service_type === 'mesa_fija' ? '🪑' : '🛍️'}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {order.table_or_token_number
                    ? order.service_type === 'paleta_madera'
                      ? `Tu Paleta de Mesa es la #${order.table_or_token_number}`
                      : order.service_type === 'mesa_fija'
                        ? `Asignado a la Mesa #${order.table_or_token_number}`
                        : `Pedido Para Llevar (#${order.table_or_token_number})`
                    : 'Ubicación en proceso de asignación en caja'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {order.service_type === 'paleta_madera'
                    ? 'Toma asiento en cualquier mesa libre y coloca tu número visible. ¡El mesero te llevará tu comida!'
                    : order.service_type === 'mesa_fija'
                      ? 'Tu pedido será servido en tu mesa.'
                      : 'Retira tu pedido en el mostrador cuando esté listo.'}
                </p>
              </div>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                order.payment_status === 'pagado'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }`}
            >
              {order.payment_status === 'pagado'
                ? `✓ PAGADO (${order.payment_method || 'Caja'})`
                : '⏳ Pago pendiente en caja'}
            </span>
          </div>

          {/* Stepper Visual de Progreso */}
          {currentMeta.step > 0 && (
            <div className="py-2">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { step: 1, label: 'Recibido' },
                  { step: 2, label: 'Confirmado' },
                  { step: 3, label: 'En Cocina' },
                  { step: 4, label: '¡Listo!' },
                ].map((s) => {
                  const isCurrent = currentMeta.step === s.step;
                  const isDone = currentMeta.step >= s.step;
                  return (
                    <div key={s.step} className="space-y-1.5">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isDone ? currentMeta.color : 'bg-muted'
                        } ${isCurrent ? 'animate-pulse' : ''}`}
                      />
                      <span
                        className={`block text-[11px] font-medium ${
                          isDone ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">{currentMeta.desc}</p>
            </div>
          )}

          {/* Si fue rechazado */}
          {order.status === 'rechazado' && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-semibold">El pedido no pudo ser atendido.</p>
              {order.rejection_reason && (
                <p className="mt-1 text-xs text-destructive/90">
                  <strong>Motivo del restaurante:</strong> {order.rejection_reason}
                </p>
              )}
            </div>
          )}

          {/* Detalle de productos */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Resumen del Pedido ({order.customer_name})
            </h3>
            <ul className="divide-y text-sm">
              {order.items.map((item, idx) => (
                <li key={`${item.product_name}-${idx}`} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-medium">
                      {item.quantity} × {item.product_name}
                    </span>
                    {item.notes && <p className="text-xs text-muted-foreground">Nota: {item.notes}</p>}
                  </div>
                  <span className="font-semibold">
                    ${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between border-t pt-3 text-base font-bold">
              <span>Total a Pagar:</span>
              <span className="text-primary">${(order.total_cents / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Acciones del Cliente */}
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <button
              type="button"
              onClick={copyTrackingLink}
              className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors"
            >
              {copied ? '✓ ¡Enlace copiado!' : '🔗 Copiar enlace de seguimiento'}
            </button>

            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
