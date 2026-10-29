'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Copy,
  Check,
  ArrowLeft,
  UtensilsCrossed,
  AlertCircle,
  ShoppingBag,
  Armchair,
} from 'lucide-react';
import {
  getActiveOrder,
  getSavedCustomerInfo,
  saveActiveOrder,
  saveCustomerInfo,
} from '@/lib/orders/session';

type TrackedOrder = {
  id: string;
  tracking_code: string;
  tracking_token?: string;
  restaurant_slug?: string;
  restaurant_name?: string;
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
  { label: string; step: number; desc: string; badgeStyle: string }
> = {
  pendiente: {
    label: 'Recibido en local',
    step: 1,
    desc: 'Tu pedido ha llegado al restaurante. Esperando confirmación.',
    badgeStyle: 'bg-[#FEF9EE] text-[#8F5E00] border-[#EAA228]/40',
  },
  confirmado: {
    label: 'Confirmado por restaurante',
    step: 2,
    desc: 'El restaurante aceptó tu pedido y se enviará a cocina.',
    badgeStyle: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  preparando: {
    label: 'En preparación en cocina',
    step: 3,
    desc: 'Tus platos se están preparando en este momento.',
    badgeStyle: 'bg-[#FEF9EE] text-[#8F5E00] border-[#EAA228]/50',
  },
  listo: {
    label: 'Listo para servir / retirar',
    step: 4,
    desc: 'Tu pedido está listo. Puedes acercarte al mostrador o esperar en tu mesa.',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  completado: {
    label: 'Entregado',
    step: 5,
    desc: 'Pedido entregado exitosamente. ¡Buen provecho!',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  rechazado: {
    label: 'No disponible',
    step: 0,
    desc: 'El restaurante no pudo atender este pedido en este momento.',
    badgeStyle: 'bg-red-50 text-red-700 border-red-200',
  },
  cancelado: {
    label: 'Cancelado',
    step: 0,
    desc: 'Este pedido fue cancelado.',
    badgeStyle: 'bg-[#F2EFE9] text-[#666E7A] border-[#EAE5DE]',
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
  const [restaurantSlug, setRestaurantSlug] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const searchOrder = useCallback(
    async (targetCode: string, targetPhone: string, isSilent = false) => {
      const cleanCode = targetCode.trim();
      const cleanPhone = targetPhone.trim();

      if (!cleanCode || !cleanPhone) {
        if (!isSilent) {
          setError('Ingresa el código del pedido y tu número de teléfono registrado.');
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
        setLastUpdated(
          new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        );

        saveCustomerInfo(body.order.customer_name, cleanPhone);
        const existingActive = getActiveOrder();
        const rSlug = body.order.restaurant_slug || existingActive?.restaurantSlug || '';
        const rName = body.order.restaurant_name || existingActive?.restaurantName || '';
        if (rSlug) setRestaurantSlug(rSlug);
        if (rName) setRestaurantName(rName);

        saveActiveOrder({
          id: body.order.id,
          trackingCode: body.order.tracking_code,
          trackingToken: body.order.tracking_token || existingActive?.trackingToken || cleanCode,
          phone: cleanPhone,
          customerName: body.order.customer_name,
          restaurantSlug: rSlug,
          restaurantName: rName,
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

      if (active?.restaurantSlug) setRestaurantSlug(active.restaurantSlug);
      if (active?.restaurantName) setRestaurantName(active.restaurantName);

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

      if (effectiveCode && effectivePhone) {
        void searchOrder(effectiveCode, effectivePhone, false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialCode, initialPhone, searchOrder]);

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
      {/* Formulario de búsqueda si no hay orden activa */}
      {(!order || !initialCode) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void searchOrder(code, phone, false);
          }}
          className="rounded-[28px] border border-[#EAE5DE] bg-white p-6 md:p-8 shadow-[0_12px_40px_rgba(24,28,32,0.05)] space-y-5"
        >
          <div>
            <h2 className="text-xl font-black text-[#181C20]">Buscar estado de pedido</h2>
            <p className="mt-1 text-xs text-[#666E7A]">
              Ingresa el código que te entregaron y tu teléfono de contacto.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="searchCode" className="block text-xs font-black text-[#181C20] uppercase tracking-wider mb-1.5">
                Código del pedido
              </label>
              <input
                id="searchCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. PK-ABC123"
                className="h-12 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 px-3.5 text-sm uppercase font-mono font-bold text-[#181C20] placeholder:text-[#8C95A3] focus:bg-white focus:ring-2 focus:ring-[#EAA228] focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="searchPhone" className="block text-xs font-black text-[#181C20] uppercase tracking-wider mb-1.5">
                Teléfono registrado
              </label>
              <input
                id="searchPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 0991234567"
                type="tel"
                className="h-12 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 px-3.5 text-sm font-semibold text-[#181C20] placeholder:text-[#8C95A3] focus:bg-white focus:ring-2 focus:ring-[#EAA228] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-xs uppercase tracking-wider shadow-sm transition-all hover:shadow disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Consultando pedido...' : 'Ver estado del pedido'}
          </button>
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p>{error}</p>
            <p className="mt-0.5 text-[11px] font-normal text-red-600">Verifica que el número coincida con el usado en el pedido.</p>
          </div>
        </div>
      )}

      {/* Tarjeta de Seguimiento del Pedido */}
      {order && currentMeta && (
        <div className="rounded-[28px] border border-[#EAE5DE] bg-white p-6 md:p-8 shadow-[0_12px_40px_rgba(24,28,32,0.06)] space-y-6">
          {/* Cabecera */}
          <div className="flex flex-col gap-3 pb-6 border-b border-[#EAE5DE] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-[#181C20] bg-[#FAF7F2] border border-[#EAE5DE] px-2.5 py-1 rounded-md">
                  {order.tracking_code}
                </span>
                <span className="text-[#8C95A3]">·</span>
                <span className="text-xs font-bold text-[#666E7A]">
                  {new Date(order.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-black text-[#181C20]">
                {currentMeta.label}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE5DE] bg-[#FAF7F2] px-3 py-1.5 text-xs font-bold text-[#181C20]">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                En vivo {lastUpdated && `(${lastUpdated})`}
              </span>
              <button
                type="button"
                onClick={() => void searchOrder(code, phone, false)}
                className="h-9 w-9 rounded-full border border-[#EAE5DE] bg-white flex items-center justify-center text-[#181C20] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                title="Actualizar estado"
                aria-label="Actualizar estado"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Información de entrega / servicio y estado de pago */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white border border-[#EAE5DE] flex items-center justify-center shrink-0 text-[#181C20]">
                {order.service_type === 'paleta_madera' ? (
                  <UtensilsCrossed className="h-5 w-5 text-[#EAA228]" />
                ) : order.service_type === 'mesa_fija' ? (
                  <Armchair className="h-5 w-5 text-[#EAA228]" />
                ) : (
                  <ShoppingBag className="h-5 w-5 text-[#EAA228]" />
                )}
              </div>
              <div>
                <p className="text-sm font-black text-[#181C20]">
                  {order.table_or_token_number
                    ? order.service_type === 'paleta_madera'
                      ? `Paleta de mesa #${order.table_or_token_number}`
                      : order.service_type === 'mesa_fija'
                        ? `Mesa #${order.table_or_token_number}`
                        : `Para llevar (Ficha #${order.table_or_token_number})`
                    : 'Ubicación pendiente de asignación'}
                </p>
                <p className="text-xs text-[#666E7A]">
                  {order.service_type === 'paleta_madera'
                    ? 'Toma asiento en cualquier mesa disponible y coloca tu número visible.'
                    : order.service_type === 'mesa_fija'
                      ? 'El personal servirá el pedido en tu mesa asignada.'
                      : 'Retira tu orden en el mostrador cuando esté lista.'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${
                  order.payment_status === 'pagado'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-[#EAA228]/40 bg-[#FEF9EE] text-[#8F5E00]'
                }`}
              >
                {order.payment_status === 'pagado'
                  ? `Pagado (${order.payment_method || 'Caja'})`
                  : 'Pagas al retirar en caja'}
              </span>
            </div>
          </div>

          {/* Stepper visual elegante */}
          {currentMeta.step > 0 && (
            <div className="py-2 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { step: 1, label: 'Recibido' },
                  { step: 2, label: 'Confirmado' },
                  { step: 3, label: 'En cocina' },
                  { step: 4, label: 'Listo' },
                ].map((s) => {
                  const isCurrent = currentMeta.step === s.step;
                  const isDone = currentMeta.step >= s.step;
                  return (
                    <div key={s.step} className="space-y-1.5 text-center">
                      <div
                        className={`h-2.5 rounded-full transition-colors duration-300 ${
                          isDone ? 'bg-[#EAA228]' : 'bg-[#EAE5DE]'
                        } ${isCurrent ? 'ring-2 ring-[#EAA228] ring-offset-2' : ''}`}
                      />
                      <span
                        className={`block text-xs font-black ${
                          isDone ? 'text-[#181C20]' : 'text-[#8C95A3]'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-xs font-medium text-[#666E7A]">{currentMeta.desc}</p>
            </div>
          )}

          {/* Banner de Aviso Especial cuando el Pedido está LISTO */}
          {order.status === 'listo' && (
            <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/90 p-5 text-center space-y-2 shadow-[0_8px_30px_rgba(16,185,129,0.15)] animate-in fade-in zoom-in-95 duration-300">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm mx-auto">
                <UtensilsCrossed className="h-6 w-6 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-emerald-950">¡Tu pedido está LISTO para servir / retirar!</h3>
              <p className="text-xs font-semibold text-emerald-800 max-w-md mx-auto">
                {order.service_type === 'para_llevar'
                  ? `Acércate al mostrador de entrega con tu código #${order.tracking_code} ${
                      order.table_or_token_number ? `(Ficha #${order.table_or_token_number})` : ''
                    }.`
                  : `El personal del restaurante ya tiene preparado tu pedido para servir en tu ${
                      order.service_type === 'paleta_madera' ? 'paleta' : 'mesa'
                    } #${order.table_or_token_number || ''}.`}
              </p>
            </div>
          )}

          {/* Si fue rechazado */}
          {order.status === 'rechazado' && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 font-bold">
              <p>El pedido no pudo ser atendido.</p>
              {order.rejection_reason && (
                <p className="mt-1 font-normal text-red-600">
                  Motivo: {order.rejection_reason}
                </p>
              )}
            </div>
          )}

          {/* Resumen de items del pedido */}
          <div className="border-t border-[#EAE5DE] pt-5 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#666E7A]">
              Resumen del pedido ({order.customer_name})
            </h2>
            <ul className="divide-y divide-[#EAE5DE] text-sm">
              {order.items.map((item, idx) => (
                <li key={`${item.product_name}-${idx}`} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-[#181C20]">
                      {item.quantity} × {item.product_name}
                    </span>
                    {item.notes && <p className="text-xs text-[#666E7A] mt-0.5">Nota: {item.notes}</p>}
                  </div>
                  <span className="font-extrabold text-[#181C20]">
                    ${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-[#EAE5DE] pt-4">
              <span className="text-base font-extrabold text-[#181C20]">Total:</span>
              <span className="text-2xl font-black text-[#181C20]">
                ${(order.total_cents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Acciones del usuario */}
          <div className="flex flex-col sm:flex-row gap-3 border-t border-[#EAE5DE] pt-5">
            <button
              type="button"
              onClick={copyTrackingLink}
              className="h-12 flex-1 rounded-xl border border-[#EAE5DE] bg-white px-5 text-xs font-black text-[#181C20] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Enlace copiado' : 'Copiar enlace de seguimiento'}</span>
            </button>

            {restaurantSlug ? (
              <Link
                href={`/${restaurantSlug}/pedir`}
                className="h-12 rounded-xl border border-[#EAE5DE] bg-[#FAF7F2] px-6 text-xs font-black text-[#181C20] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#EAE5DE] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver a la carta {restaurantName ? `(${restaurantName})` : ''}</span>
              </Link>
            ) : (
              <Link
                href="/"
                className="h-12 rounded-xl border border-[#EAE5DE] bg-[#FAF7F2] px-6 text-xs font-black text-[#181C20] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#EAE5DE] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver al inicio</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

