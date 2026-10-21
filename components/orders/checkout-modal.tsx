'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { CartItem } from '@/lib/orders/types';

type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
];

export function CheckoutModal({
  isOpen,
  onClose,
  cart,
  restaurantName,
  customerName,
  customerPhone,
  onUpdateCustomer,
  onSubmitOrder,
  isSubmitting,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  onUpdateCustomer: (name: string, phone: string) => void;
  onSubmitOrder: (extraNotes?: string) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
}) {
  const [name, setName] = useState(customerName || '');
  const [phone, setPhone] = useState(customerPhone || '+593 ');
  const [orderSchedule, setOrderSchedule] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledTime, setScheduledTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [billingType, setBillingType] = useState<'final' | 'datos'>('final');
  const [billingRuc, setBillingRuc] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  const subtotalCents = cart.reduce((sum, it) => sum + it.price_cents * it.quantity, 0);
  const total = (subtotalCents / 100).toFixed(2);
  const itemCount = cart.reduce((sum, it) => sum + it.quantity, 0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    onUpdateCustomer(name, phone);

    // Compilar notas de facturación / entrega si aplican
    const notesArr: string[] = [];
    if (orderSchedule === 'scheduled' && scheduledTime.trim()) {
      notesArr.push(`[Hora programada: ${scheduledTime}]`);
    }
    notesArr.push(`[Pago: ${paymentMethod.toUpperCase()}]`);
    if (billingType === 'datos' && billingRuc.trim()) {
      notesArr.push(`[Factura: RUC ${billingRuc} - ${billingName} - Dir: ${billingAddress}]`);
    }

    await onSubmitOrder(notesArr.join(' '));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <header className="sticky top-0 z-10 h-16 border-b border-line bg-white sm:h-[72px]">
        <div className="mx-auto flex h-full max-w-[640px] items-center gap-2 px-4 sm:px-8">
          <button type="button" onClick={onClose} className="btn-icon -ml-3" aria-label="Volver al pedido">
            <ArrowLeft className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <span className="text-lg font-extrabold">{restaurantName}</span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-[640px] space-y-12 px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
        <div className="space-y-2">
          <h1 id="checkout-title" className="h-page">Confirma tu pedido</h1>
          <p className="text-lg text-muted-ink">
            {itemCount} {itemCount === 1 ? 'producto' : 'productos'} · pagas al retirar
          </p>
        </div>

        {/* Tus datos */}
        <section className="space-y-4">
          <h2 className="h-section">Tus datos</h2>
          <div className="space-y-2">
            <label htmlFor="checkout-name" className="block text-base font-bold">Nombre</label>
            <input
              id="checkout-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              className="field"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="checkout-phone" className="block text-base font-bold">Teléfono</label>
            <input
              id="checkout-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              required
              className="field"
            />
          </div>
        </section>

        {/* Cuándo */}
        <section className="space-y-4">
          <h2 className="h-section">¿Para cuándo?</h2>
          <div role="radiogroup" aria-label="Hora de retiro" className="flex flex-wrap gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={orderSchedule === 'asap'}
              onClick={() => setOrderSchedule('asap')}
              className={`pill ${orderSchedule === 'asap' ? 'pill-active' : ''}`}
            >
              Lo antes posible
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={orderSchedule === 'scheduled'}
              onClick={() => setOrderSchedule('scheduled')}
              className={`pill ${orderSchedule === 'scheduled' ? 'pill-active' : ''}`}
            >
              Programar
            </button>
          </div>
          {orderSchedule === 'scheduled' && (
            <div className="space-y-2">
              <label htmlFor="checkout-time" className="block text-base font-bold">Hora de retiro</label>
              <input
                id="checkout-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="field"
              />
            </div>
          )}
        </section>

        {/* Pago */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="h-section">¿Cómo vas a pagar?</h2>
            <p className="text-secondary">No cobramos nada ahora. Pagas cuando retiras.</p>
          </div>
          <div role="radiogroup" aria-label="Método de pago" className="flex flex-wrap gap-2">
            {paymentOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={paymentMethod === opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className={`pill ${paymentMethod === opt.value ? 'pill-active' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Factura */}
        <section className="space-y-4">
          <h2 className="h-section">Factura</h2>
          <div role="radiogroup" aria-label="Tipo de factura" className="flex flex-wrap gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={billingType === 'final'}
              onClick={() => setBillingType('final')}
              className={`pill ${billingType === 'final' ? 'pill-active' : ''}`}
            >
              Consumidor final
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billingType === 'datos'}
              onClick={() => setBillingType('datos')}
              className={`pill ${billingType === 'datos' ? 'pill-active' : ''}`}
            >
              Con mis datos
            </button>
          </div>
          {billingType === 'datos' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="billing-ruc" className="block text-base font-bold">RUC o cédula</label>
                <input id="billing-ruc" type="text" inputMode="numeric" value={billingRuc} onChange={(e) => setBillingRuc(e.target.value)} className="field" />
              </div>
              <div className="space-y-2">
                <label htmlFor="billing-name" className="block text-base font-bold">Razón social</label>
                <input id="billing-name" type="text" value={billingName} onChange={(e) => setBillingName(e.target.value)} className="field" />
              </div>
              <div className="space-y-2">
                <label htmlFor="billing-address" className="block text-base font-bold">Dirección</label>
                <input id="billing-address" type="text" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="field" />
              </div>
            </div>
          )}
        </section>

        {/* Total + acción */}
        <section className="space-y-4 border-t border-line pt-8">
          <div className="flex items-baseline justify-between">
            <span className="text-lg text-muted-ink">Total a pagar al retirar</span>
            <span className="text-[32px] font-extrabold leading-none">${total}</span>
          </div>

          {error && <p role="alert" className="error-text">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || cart.length === 0}
            className="btn-primary w-full"
          >
            {isSubmitting ? 'Enviando…' : 'Enviar pedido'}
          </button>
        </section>
      </form>
    </div>
  );
}
