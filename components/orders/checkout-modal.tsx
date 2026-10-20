'use client';

import { useState } from 'react';
import type { CartItem } from '@/lib/orders/types';

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
  const [name, setName] = useState(customerName || 'Cliente');
  const [email, setEmail] = useState('cliente@ejemplo.com');
  const [phone, setPhone] = useState(customerPhone || '+593 ');
  const [orderSchedule, setOrderSchedule] = useState<'asap' | 'scheduled'>('asap');
  const [scheduledTime, setScheduledTime] = useState('Hoy 11:30');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [billingType, setBillingType] = useState<'final' | 'datos'>('final');
  const [billingRuc, setBillingRuc] = useState('');
  const [billingName, setBillingName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showCartItems, setShowCartItems] = useState(false);

  const subtotalCents = cart.reduce((sum, it) => sum + it.price_cents * it.quantity, 0);
  const subtotal = (subtotalCents / 100).toFixed(2);
  const total = subtotal;

  if (!isOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim()) {
      setCouponApplied(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;

    onUpdateCustomer(name, phone);

    // Compilar notas de facturación / entrega si aplican
    const notesArr: string[] = [];
    if (orderSchedule === 'scheduled') {
      notesArr.push(`[Hora programada: ${scheduledTime}]`);
    }
    notesArr.push(`[Pago: ${paymentMethod.toUpperCase()}]`);
    if (billingType === 'datos' && billingRuc.trim()) {
      notesArr.push(`[Factura: RUC ${billingRuc} - ${billingName} - Dir: ${billingAddress}]`);
    }

    await onSubmitOrder(notesArr.join(' '));
  };

  const initialLetter = (name.trim()[0] || 'M').toLowerCase();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Volver al menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Checkout</h1>

          <div className="w-8" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Details, Time, Payment, Coupon) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Store Card matching Image 3 */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Retirar En {restaurantName}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Sucursal Principal · Paktak Tech
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Cambiar
              </button>
            </div>

            {/* Hora de Retiro matching Image 3 */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-3.5">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Hora De Retiro</h3>

              <div
                onClick={() => setOrderSchedule('asap')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  orderSchedule === 'asap'
                    ? 'border-[#f3a806] bg-amber-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Preparar de inmediato</p>
                  <p className="text-[11px] text-zinc-500">Listo en ~15 a 25 minutos</p>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  orderSchedule === 'asap' ? 'border-[#f3a806]' : 'border-zinc-400'
                }`}>
                  {orderSchedule === 'asap' && <div className="w-2 h-2 rounded-full bg-[#f3a806]" />}
                </div>
              </div>

              <div
                onClick={() => setOrderSchedule('scheduled')}
                className={`flex items-start justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  orderSchedule === 'scheduled'
                    ? 'border-[#f3a806] bg-amber-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Programar Pedido</p>
                  <p className="text-[11px] text-zinc-500">Escoge el día y la hora en que quieres recibir tu pedido</p>
                  {orderSchedule === 'scheduled' && (
                    <input
                      type="text"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      placeholder="Ej: Hoy 14:30"
                      className="mt-2 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  )}
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  orderSchedule === 'scheduled' ? 'border-[#f3a806]' : 'border-zinc-400'
                }`}>
                  {orderSchedule === 'scheduled' && <div className="w-2 h-2 rounded-full bg-[#f3a806]" />}
                </div>
              </div>
            </div>

            {/* Elige un Método de Pago matching Image 3 */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Elige Un Método De Pago</h3>

              <div
                onClick={() => setPaymentMethod('efectivo')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'efectivo'
                    ? 'border-[#f3a806] bg-amber-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">💵</span>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Efectivo</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'efectivo' ? 'border-[#f3a806]' : 'border-zinc-400'
                }`}>
                  {paymentMethod === 'efectivo' && <div className="w-2 h-2 rounded-full bg-[#f3a806]" />}
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('tarjeta')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'tarjeta'
                    ? 'border-[#f3a806] bg-amber-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">💳</span>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Tarjeta Crédito - Débito</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'tarjeta' ? 'border-[#f3a806]' : 'border-zinc-400'
                }`}>
                  {paymentMethod === 'tarjeta' && <div className="w-2 h-2 rounded-full bg-[#f3a806]" />}
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod('transferencia')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'transferencia'
                    ? 'border-[#f3a806] bg-amber-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">📲</span>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Transferencia Bancaria</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'transferencia' ? 'border-[#f3a806]' : 'border-zinc-400'
                }`}>
                  {paymentMethod === 'transferencia' && <div className="w-2 h-2 rounded-full bg-[#f3a806]" />}
                </div>
              </div>
            </div>

            {/* Cupón de descuento matching Image 3 */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4.5 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>¿Tienes un cupón de descuento?</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Código"
                    className="h-8 w-24 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 text-xs uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200"
                  >
                    {couponApplied ? '✓' : 'Agregar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Customer, Billing, Summary, CTA) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Customer Box matching Image 3 */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm uppercase">
                  {initialLetter}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre completo"
                    required
                    className="w-full text-sm font-bold text-zinc-900 dark:text-zinc-100 bg-transparent border-0 p-0 focus:ring-0 truncate"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full text-xs text-zinc-500 bg-transparent border-0 p-0 focus:ring-0 truncate"
                  />
                </div>
              </div>

              {/* Teléfono with border & label matching Image 3 */}
              <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-700 p-2.5">
                <label className="absolute -top-2 left-3 bg-white dark:bg-zinc-900 px-1 text-[10px] text-zinc-500 font-medium">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+593 999954348"
                  required
                  className="w-full text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent border-0 p-0 focus:outline-hidden"
                />
              </div>

              {/* Datos de Facturación matching Image 3 */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Datos De Facturación
                </h4>

                {/* Option 1: Consumidor Final */}
                <div
                  onClick={() => setBillingType('final')}
                  className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    billingType === 'final'
                      ? 'border-[#f3a806] bg-amber-500/5'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="pr-3">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Consumidor Final</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                      No se usarán datos en tu factura pero no se podrá hacer cambios ni devoluciones en la orden
                    </p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    billingType === 'final' ? 'border-[#f3a806]' : 'border-zinc-400'
                  }`}>
                    {billingType === 'final' && <div className="w-2 h-2 rounded-full bg-[#f3a806]" />}
                  </div>
                </div>

                {/* Option 2: Con Datos */}
                <div
                  onClick={() => setBillingType('datos')}
                  className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    billingType === 'datos'
                      ? 'border-[#f3a806] bg-amber-500/5'
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="pr-3 flex-1">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Datos De Facturación</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                      Se te emitirá una factura con los datos ingresados.
                    </p>
                    {billingType === 'datos' && (
                      <div className="mt-3 space-y-2">
                        <input
                          type="text"
                          value={billingRuc}
                          onChange={(e) => setBillingRuc(e.target.value)}
                          placeholder="RUC o Cédula"
                          className="w-full h-7 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-xs"
                        />
                        <input
                          type="text"
                          value={billingName}
                          onChange={(e) => setBillingName(e.target.value)}
                          placeholder="Razón Social / Nombre"
                          className="w-full h-7 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-xs"
                        />
                        <input
                          type="text"
                          value={billingAddress}
                          onChange={(e) => setBillingAddress(e.target.value)}
                          placeholder="Dirección Fiscal"
                          className="w-full h-7 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-xs"
                        />
                      </div>
                    )}
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    billingType === 'datos' ? 'border-[#f3a806]' : 'border-zinc-400'
                  }`}>
                    {billingType === 'datos' && <div className="w-2 h-2 rounded-full bg-[#f3a806]" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Ver carrito (X artículos) collapsible matching Image 3 */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setShowCartItems(!showCartItems)}
                className="w-full p-4 flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Ver carrito ({cart.length} artículos)</span>
                </div>
                <span className="text-zinc-400">{showCartItems ? '▲' : '▼'}</span>
              </button>

              {showCartItems && (
                <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {cart.map((it) => (
                    <div key={it.id} className="py-2 flex items-center justify-between">
                      <span className="truncate pr-2">
                        {it.quantity}x {it.name}
                      </span>
                      <span className="font-semibold shrink-0">
                        ${((it.price_cents * it.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen Del Pedido matching Image 3 */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Resumen Del Pedido
              </h4>

              <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">${subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">$0.00</span>
                </div>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-sm font-black text-zinc-900 dark:text-zinc-100">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>

              {/* Checkbox Términos matching Image 3 */}
              <div className="pt-2 flex items-start gap-2.5">
                <input
                  id="terms-checkbox"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 mt-0.5"
                />
                <label htmlFor="terms-checkbox" className="text-[11px] text-zinc-500 leading-tight">
                  Acepto los términos y condiciones.{' '}
                  <span className="text-zinc-700 dark:text-zinc-300 underline cursor-pointer">
                    Leer términos y condiciones
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* Golden Button matching Image 3 */}
              <button
                type="submit"
                disabled={isSubmitting || !termsAccepted || cart.length === 0}
                className="w-full h-12 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Enviando pedido...</span>
                  </>
                ) : (
                  <span>Realizar pedido</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
