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
    badgeStyle: 'bg-[#FFF8E7] text-[#9A6700] border-[#FFE6A5]',
  },
  confirmado: {
    label: 'Confirmado por restaurante',
    step: 2,
    desc: 'El restaurante aceptó tu pedido y se enviará a cocina.',
    badgeStyle: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  },
  preparando: {
    label: 'En preparación en cocina',
    step: 3,
    desc: 'Tus platos se están preparando en este momento.',
    badgeStyle: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]',
  },
  listo: {
    label: 'Listo para servir / retirar',
    step: 4,
    desc: 'Tu pedido está listo. Puedes acercarte al mostrador o esperar en tu mesa.',
    badgeStyle: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  },
  completado: {
    label: 'Entregado',
    step: 5,
    desc: 'Pedido entregado exitosamente. Buen provecho.',
    badgeStyle: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  },
  rechazado: {
    label: 'No disponible',
    step: 0,
    desc: 'El restaurante no pudo atender este pedido en este momento.',
    badgeStyle: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
  },
  cancelado: {
    label: 'Cancelado',
    step: 0,
    desc: 'Este pedido fue cancelado.',
    badgeStyle: 'bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]',
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
          className="rounded-[24px] border border-[#E8E8E8] bg-white p-6 md:p-8 space-y-5"
        >
          <div>
            <h2 className="text-xl font-extrabold text-[#1A1A1A]">Consultar mi pedido</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              Ingresa el código que te entregaron y tu teléfono de contacto.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="searchCode" className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
                Código del pedido
              </label>
              <input
                id="searchCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. PK-ABC123"
                className="h-12 w-full rounded-2xl border border-[#E8E8E8] bg-white px-4 text-base uppercase font-mono text-[#1A1A1A] placeholder:text-[#A1A1AA] focus:border-[#1A1A1A] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="searchPhone" className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
                Teléfono registrado
              </label>
              <input
                id="searchPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 0991234567"
                type="tel"
                className="h-12 w-full rounded-2xl border border-[#E8E8E8] bg-white px-4 text-base text-[#1A1A1A] placeholder:text-[#A1A1AA] focus:border-[#1A1A1A] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-full bg-[#FFC21A] text-[#1A1A1A] font-extrabold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Consultando pedido...' : 'Ver estado del pedido'}
          </button>
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{error}</p>
            <p className="mt-0.5 text-xs text-[#DC2626]">Verifica que el número coincida con el usado en el pedido.</p>
          </div>
        </div>
      )}

      {/* Tarjeta de Seguimiento del Pedido */}
      {order && currentMeta && (
        <div className="rounded-[24px] border border-[#E8E8E8] bg-white p-6 md:p-8 space-y-6">
          {/* Cabecera */}
          <div className="flex flex-col gap-3 pb-6 border-b border-[#E8E8E8] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-[#1A1A1A]">
                  {order.tracking_code}
                </span>
                <span className="text-[#6B6B6B]">·</span>
                <span className="text-xs text-[#6B6B6B]">
                  {new Date(order.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-[#1A1A1A]">
                {currentMeta.label}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E8] bg-[#F7F7F7] px-3 py-1.5 text-xs font-semibold text-[#1A1A1A]">
                <span className="h-2 w-2 rounded-full bg-[#15803D] animate-pulse" />
                En vivo {lastUpdated && `(${lastUpdated})`}
              </span>
              <button
                type="button"
                onClick={() => void searchOrder(code, phone, false)}
                className="h-9 w-9 rounded-full border border-[#E8E8E8] bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#F7F7F7]"
                title="Actualizar estado"
                aria-label="Actualizar estado"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Información de entrega / servicio y estado de pago */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#E8E8E8] bg-[#F7F7F7] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white border border-[#E8E8E8] flex items-center justify-center shrink-0">
                {order.service_type === 'paleta_madera' ? (
                  <UtensilsCrossed className="h-5 w-5 text-[#1A1A1A]" />
                ) : order.service_type === 'mesa_fija' ? (
                  <Armchair className="h-5 w-5 text-[#1A1A1A]" />
                ) : (
                  <ShoppingBag className="h-5 w-5 text-[#1A1A1A]" />
                )}
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#1A1A1A]">
                  {order.table_or_token_number
                    ? order.service_type === 'paleta_madera'
                      ? `Paleta de mesa #${order.table_or_token_number}`
                      : order.service_type === 'mesa_fija'
                        ? `Mesa #${order.table_or_token_number}`
                        : `Para llevar (Ficha #${order.table_or_token_number})`
                    : 'Ubicación pendiente de asignación'}
                </p>
                <p className="text-xs text-[#6B6B6B]">
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
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                  order.payment_status === 'pagado'
                    ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
                    : 'border-[#FFE6A5] bg-[#FFF8E7] text-[#9A6700]'
                }`}
              >
                {order.payment_status === 'pagado'
                  ? `Pagado (${order.payment_method || 'Caja'})`
                  : 'Pagas al retirar en caja'}
              </span>
            </div>
          </div>

          {/* Stepper visual minimalista */}
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
                        className={`h-2 rounded-full transition-colors duration-300 ${
                          isDone ? 'bg-[#1A1A1A]' : 'bg-[#E8E8E8]'
                        } ${isCurrent ? 'ring-2 ring-[#FFC21A]' : ''}`}
                      />
                      <span
                        className={`block text-xs font-semibold ${
                          isDone ? 'text-[#1A1A1A]' : 'text-[#A1A1AA]'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-xs text-[#6B6B6B]">{currentMeta.desc}</p>
            </div>
          )}

          {/* Si fue rechazado */}
          {order.status === 'rechazado' && (
            <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
              <p className="font-extrabold">El pedido no pudo ser atendido.</p>
              {order.rejection_reason && (
                <p className="mt-1 text-xs text-[#DC2626]">
                  Motivo: {order.rejection_reason}
                </p>
              )}
            </div>
          )}

          {/* Resumen de items del pedido */}
          <div className="border-t border-[#E8E8E8] pt-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              Resumen del pedido ({order.customer_name})
            </h2>
            <ul className="divide-y divide-[#E8E8E8] text-sm">
              {order.items.map((item, idx) => (
                <li key={`${item.product_name}-${idx}`} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-[#1A1A1A]">
                      {item.quantity} × {item.product_name}
                    </span>
                    {item.notes && <p className="text-xs text-[#6B6B6B] mt-0.5">Nota: {item.notes}</p>}
                  </div>
                  <span className="font-extrabold text-[#1A1A1A]">
                    ${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-[#E8E8E8] pt-4">
              <span className="text-base font-semibold text-[#1A1A1A]">Total:</span>
              <span className="text-2xl font-extrabold text-[#1A1A1A]">
                ${(order.total_cents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Acciones del usuario */}
          <div className="flex flex-col sm:flex-row gap-3 border-t border-[#E8E8E8] pt-5">
            <button
              type="button"
              onClick={copyTrackingLink}
              className="h-12 flex-1 rounded-full border border-[#E8E8E8] bg-white px-5 text-sm font-semibold text-[#1A1A1A] flex items-center justify-center gap-2 hover:bg-[#F7F7F7] transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Enlace copiado' : 'Copiar enlace de seguimiento'}</span>
            </button>

            <Link
              href="/"
              className="h-12 rounded-full border border-[#E8E8E8] bg-white px-6 text-sm font-semibold text-[#1A1A1A] flex items-center justify-center gap-2 hover:bg-[#F7F7F7] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver a la tienda</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
