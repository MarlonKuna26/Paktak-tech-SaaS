'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AlertModal } from '@/components/ui/alert-modal';
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
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const activeError = error && error !== dismissedError ? error : '';
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#FAF7F2] font-sans text-[#181C20]" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <header className="sticky top-0 z-10 h-16 border-b border-[#EAE5DE] bg-[#FAF7F2]/90 backdrop-blur-md sm:h-[72px]">
        <div className="mx-auto flex h-full max-w-[640px] items-center gap-3 px-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-[#EAE5DE] bg-white flex items-center justify-center text-[#666E7A] hover:text-[#181C20] transition-colors cursor-pointer shadow-2xs"
            aria-label="Volver al pedido"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <div>
            <span className="text-base font-black text-[#181C20] block leading-tight">{restaurantName}</span>
            <span className="text-[11px] font-bold text-[#8C95A3]">Confirmación de pedido</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[640px] px-4 py-8 sm:py-10 sm:px-6">
        <form onSubmit={handleSubmit} className="rounded-[32px] border border-[#EAE5DE] bg-white p-6 sm:p-9 shadow-md space-y-8">
          <div className="space-y-1 border-b border-[#EAE5DE] pb-5">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#B87A14]">
              Último paso
            </span>
            <h1 id="checkout-title" className="text-2xl sm:text-3xl font-black text-[#181C20] tracking-tight">
              Confirma tu pedido
            </h1>
            <p className="text-xs sm:text-sm text-[#666E7A]">
              {itemCount} {itemCount === 1 ? 'producto seleccionado' : 'productos seleccionados'} · pagas directamente en el local
            </p>
          </div>

          {/* Tus datos */}
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#181C20]">
              1. Tus datos de contacto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="checkout-name" className="block text-xs font-bold text-[#181C20]">
                  Tu nombre completo
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  placeholder="Ej. Juan Pérez"
                  className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/50 text-sm font-semibold text-[#181C20] placeholder:text-[#8C95A3] focus:bg-white focus:ring-2 focus:ring-[#EAA228] focus:border-transparent focus:outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="checkout-phone" className="block text-xs font-bold text-[#181C20]">
                  Teléfono / WhatsApp
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  placeholder="+593 99 999 9999"
                  className="w-full h-12 px-4 rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/50 text-sm font-semibold text-[#181C20] placeholder:text-[#8C95A3] focus:bg-white focus:ring-2 focus:ring-[#EAA228] focus:border-transparent focus:outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Cuándo */}
          <section className="space-y-3.5 pt-2 border-t border-[#EAE5DE]">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#181C20]">
              2. ¿Para cuándo lo deseas?
            </h2>
            <div role="radiogroup" aria-label="Hora de retiro" className="flex flex-wrap gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={orderSchedule === 'asap'}
                onClick={() => setOrderSchedule('asap')}
                className={`h-10 px-5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  orderSchedule === 'asap'
                    ? 'bg-[#181C20] text-white shadow-xs'
                    : 'bg-[#FAF7F2] border border-[#EAE5DE] text-[#666E7A] hover:text-[#181C20]'
                }`}
              >
                ⚡ Lo antes posible (~25 min)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={orderSchedule === 'scheduled'}
                onClick={() => setOrderSchedule('scheduled')}
                className={`h-10 px-5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  orderSchedule === 'scheduled'
                    ? 'bg-[#181C20] text-white shadow-xs'
                    : 'bg-[#FAF7F2] border border-[#EAE5DE] text-[#666E7A] hover:text-[#181C20]'
                }`}
              >
                🕒 Programar hora
              </button>
            </div>
            {orderSchedule === 'scheduled' && (
              <div className="space-y-1.5 pt-1">
                <label htmlFor="checkout-time" className="block text-xs font-bold text-[#181C20]">
                  Indica la hora estimada de retiro
                </label>
                <input
                  id="checkout-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full sm:w-48 h-11 px-4 rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/50 text-sm font-semibold text-[#181C20] focus:bg-white focus:ring-2 focus:ring-[#EAA228] focus:outline-none"
                />
              </div>
            )}
          </section>

          {/* Pago */}
          <section className="space-y-3.5 pt-2 border-t border-[#EAE5DE]">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#181C20]">
                3. Método de pago al recibir
              </h2>
              <p className="text-xs text-[#666E7A] mt-0.5">No debitamos nada ahora. Cancelas en caja o al repartidor.</p>
            </div>
            <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-3 gap-2.5">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === opt.value}
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`h-11 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    paymentMethod === opt.value
                      ? 'bg-[#EAA228] text-[#181C20] font-black shadow-xs'
                      : 'bg-[#FAF7F2] border border-[#EAE5DE] text-[#666E7A] hover:text-[#181C20]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Factura */}
          <section className="space-y-3.5 pt-2 border-t border-[#EAE5DE]">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#181C20]">
              4. Facturación
            </h2>
            <div role="radiogroup" aria-label="Tipo de factura" className="flex flex-wrap gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={billingType === 'final'}
                onClick={() => setBillingType('final')}
                className={`h-9 px-4 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingType === 'final'
                    ? 'bg-[#181C20] text-white shadow-xs'
                    : 'bg-[#FAF7F2] border border-[#EAE5DE] text-[#666E7A] hover:text-[#181C20]'
                }`}
              >
                Consumidor Final
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={billingType === 'datos'}
                onClick={() => setBillingType('datos')}
                className={`h-9 px-4 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingType === 'datos'
                    ? 'bg-[#181C20] text-white shadow-xs'
                    : 'bg-[#FAF7F2] border border-[#EAE5DE] text-[#666E7A] hover:text-[#181C20]'
                }`}
              >
                Con RUC / Cédula
              </button>
            </div>
            {billingType === 'datos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label htmlFor="billing-ruc" className="block text-[11px] font-bold text-[#181C20]">RUC o Cédula</label>
                  <input id="billing-ruc" type="text" inputMode="numeric" value={billingRuc} onChange={(e) => setBillingRuc(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#D9D3C7] bg-white text-xs font-semibold text-[#181C20] focus:ring-2 focus:ring-[#EAA228]" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="billing-name" className="block text-[11px] font-bold text-[#181C20]">Razón Social / Nombre</label>
                  <input id="billing-name" type="text" value={billingName} onChange={(e) => setBillingName(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#D9D3C7] bg-white text-xs font-semibold text-[#181C20] focus:ring-2 focus:ring-[#EAA228]" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="billing-address" className="block text-[11px] font-bold text-[#181C20]">Dirección</label>
                  <input id="billing-address" type="text" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[#D9D3C7] bg-white text-xs font-semibold text-[#181C20] focus:ring-2 focus:ring-[#EAA228]" />
                </div>
              </div>
            )}
          </section>

          {/* Total + acción */}
          <section className="space-y-4 border-t border-[#EAE5DE] pt-6">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-[#666E7A]">Total de la orden</span>
              <span className="text-3xl sm:text-4xl font-black text-[#181C20] leading-none tracking-tight">${total}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || cart.length === 0}
              className="w-full h-13 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Enviando comanda...' : 'Confirmar y Enviar Pedido →'}
            </button>
          </section>
        </form>
      </div>

      {/* Modal Central de Error al Finalizar Pedido */}
      <AlertModal
        isOpen={Boolean(activeError)}
        title="Datos Incompletos"
        message={activeError}
        variant="error"
        onClose={() => setDismissedError(error ?? '')}
      />
    </div>
  );
}
