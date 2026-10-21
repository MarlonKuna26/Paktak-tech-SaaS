'use client';

import { useMemo, useState } from 'react';
import { X, Banknote, Smartphone, CreditCard, Plus, Minus } from 'lucide-react';
import { ThermalReceiptModal } from '@/components/orders/thermal-receipt-modal';

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  notes: string | null;
};

export type TableOrderDetails = {
  orderId: string;
  orderNumber: number;
  tableNumber: number;
  zone: string | null;
  subtotalCents: number;
  items: OrderItem[];
};

export function TableCheckoutModal({
  order,
  onClose,
  onSuccess,
}: {
  order: TableOrderDetails;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tipPercent, setTipPercent] = useState<number | 'custom'>(10);
  const [customTipDollars, setCustomTipDollars] = useState('');
  const [splitPersons, setSplitPersons] = useState<number>(1);
  const [payMethod, setPayMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo');
  const [cashGivenDollars, setCashGivenDollars] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completedReceiptData, setCompletedReceiptData] = useState<{
    orderNumber: string;
    tableOrToken: string;
    dateTime: string;
    items: Array<{ name: string; quantity: number; priceCents: number; notes: string | null }>;
    totalCents: number;
    paymentMethod: string;
    paidCents?: number;
    changeCents?: number;
    tipCents?: number;
  } | null>(null);

  // Cálculo de propina en centavos
  const tipCents = useMemo(() => {
    if (tipPercent === 'custom') {
      const parsed = parseFloat(customTipDollars.replace(',', '.'));
      return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100);
    }
    return Math.round((order.subtotalCents * tipPercent) / 100);
  }, [order.subtotalCents, tipPercent, customTipDollars]);

  const totalCents = order.subtotalCents + tipCents;

  // División de cuenta
  const perPersonCents = Math.ceil(totalCents / Math.max(1, splitPersons));

  // Vuelto en efectivo
  const cashGivenCents = useMemo(() => {
    const parsed = parseFloat(cashGivenDollars.replace(',', '.'));
    return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100);
  }, [cashGivenDollars]);

  const changeCents = Math.max(0, cashGivenCents - totalCents);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (payMethod === 'efectivo' && cashGivenCents > 0 && cashGivenCents < totalCents) {
      setError('El efectivo entregado no puede ser menor al total de la cuenta.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/orders/${order.orderId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: payMethod,
          tipCents,
          paidCents: payMethod === 'efectivo' && cashGivenCents > 0 ? cashGivenCents : totalCents,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || 'No se pudo procesar el cobro');
        setIsSubmitting(false);
        return;
      }

      setCompletedReceiptData({
        orderNumber: `#${order.orderNumber}`,
        tableOrToken: `Mesa #${order.tableNumber}`,
        dateTime: new Date().toISOString(),
        items: order.items.map((it) => ({
          name: it.productName,
          quantity: it.quantity,
          priceCents: it.unitPriceCents,
          notes: it.notes,
        })),
        totalCents,
        paymentMethod: payMethod,
        paidCents: cashGivenCents > 0 ? cashGivenCents : totalCents,
        changeCents,
        tipCents,
      });

      onSuccess();
    } catch {
      setError('Error de conexión al registrar el cobro.');
      setIsSubmitting(false);
    }
  };

  if (completedReceiptData) {
    return (
      <ThermalReceiptModal
        data={{
          ...completedReceiptData,
          paymentStatus: 'pagado',
        }}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-[#E8E8E8] bg-white shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#E8E8E8] px-6 py-5">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#6B6B6B]">
              {order.zone || 'Salón'}
            </span>
            <h2 className="text-2xl font-extrabold text-[#1A1A1A]">
              Cierre de cuenta · Mesa #{order.tableNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E8E8] text-[#1A1A1A] hover:bg-[#F7F7F7]"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCheckout} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C] font-semibold">
              {error}
            </div>
          )}

          {/* Desglose de Consumo */}
          <div className="rounded-2xl border border-[#E8E8E8] bg-[#F7F7F7] p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              Consumo de la mesa
            </p>
            <div className="max-h-36 overflow-y-auto divide-y divide-[#E8E8E8] text-sm">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-extrabold text-[#1A1A1A] mr-2">{it.quantity}×</span>
                    <span className="text-[#1A1A1A]">{it.productName}</span>
                  </div>
                  <span className="font-mono font-extrabold text-[#1A1A1A]">
                    ${((it.unitPriceCents * it.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#E8E8E8] pt-2.5 flex justify-between text-sm font-extrabold">
              <span className="text-[#1A1A1A]">Subtotal consumo:</span>
              <span className="font-mono text-[#1A1A1A]">${(order.subtotalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Propina */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              Propina sugerida
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 5, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTipPercent(pct)}
                  className={`h-10 rounded-full border text-xs font-extrabold transition-colors ${
                    tipPercent === pct
                      ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                      : 'border-[#E8E8E8] bg-white text-[#1A1A1A] hover:bg-[#F7F7F7]'
                  }`}
                >
                  {pct === 0 ? 'Sin propina' : `${pct}%`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTipPercent('custom')}
                className={`h-10 rounded-full border text-xs font-extrabold transition-colors ${
                  tipPercent === 'custom'
                    ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                    : 'border-[#E8E8E8] bg-white text-[#1A1A1A] hover:bg-[#F7F7F7]'
                }`}
              >
                Otro USD
              </button>
            </div>
            {tipPercent === 'custom' && (
              <input
                type="text"
                placeholder="Monto en dólares (ej. 2.00)"
                value={customTipDollars}
                onChange={(e) => setCustomTipDollars(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#E8E8E8] bg-white px-4 text-sm text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none"
              />
            )}
          </div>

          {/* División de Cuenta Simple */}
          <div className="rounded-2xl border border-[#E8E8E8] bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                Dividir cuenta entre comensales
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSplitPersons(Math.max(1, splitPersons - 1))}
                  className="h-8 w-8 rounded-full border border-[#E8E8E8] flex items-center justify-center font-bold text-[#1A1A1A] hover:bg-[#F7F7F7]"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center font-extrabold text-sm text-[#1A1A1A]">{splitPersons}</span>
                <button
                  type="button"
                  onClick={() => setSplitPersons(splitPersons + 1)}
                  className="h-8 w-8 rounded-full border border-[#E8E8E8] flex items-center justify-center font-bold text-[#1A1A1A] hover:bg-[#F7F7F7]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {splitPersons > 1 && (
              <div className="rounded-xl border border-[#E8E8E8] bg-[#F7F7F7] p-2.5 text-center text-xs font-extrabold text-[#1A1A1A]">
                Cada persona paga ${(perPersonCents / 100).toFixed(2)} USD
              </div>
            )}
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              Método de cobro
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                  { id: 'transferencia', label: 'Transferencia', icon: Smartphone },
                  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayMethod(m.id)}
                    className={`h-12 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-colors ${
                      payMethod === m.id
                        ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                        : 'border-[#E8E8E8] bg-white text-[#1A1A1A] hover:bg-[#F7F7F7]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monto entregado y vuelto (si es efectivo) */}
          {payMethod === 'efectivo' && (
            <div className="rounded-2xl border border-[#E8E8E8] bg-[#F7F7F7] p-4 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                Efectivo recibido del cliente
              </label>
              <input
                type="text"
                placeholder={`Ej: ${Math.ceil(totalCents / 100)} o 20.00`}
                value={cashGivenDollars}
                onChange={(e) => setCashGivenDollars(e.target.value)}
                className="h-12 w-full rounded-xl border border-[#E8E8E8] bg-white px-4 text-base font-mono font-bold text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none"
              />
              {cashGivenCents > totalCents && (
                <div className="flex justify-between items-center pt-2 text-sm font-extrabold text-[#15803D]">
                  <span>Vuelto a entregar:</span>
                  <span className="font-mono text-base">${(changeCents / 100).toFixed(2)} USD</span>
                </div>
              )}
            </div>
          )}

          {/* Total Definitivo */}
          <div className="rounded-2xl border border-[#E8E8E8] bg-[#F7F7F7] p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">Total a cobrar</p>
              <p className="text-xs text-[#6B6B6B]">Incluye propina: ${(tipCents / 100).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-3xl font-extrabold text-[#1A1A1A]">
                ${(totalCents / 100).toFixed(2)}
              </span>
              <span className="block text-[11px] font-bold text-[#6B6B6B]">USD</span>
            </div>
          </div>

          {/* Botón de Confirmación */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full rounded-full bg-[#FFC21A] text-base font-extrabold text-[#1A1A1A] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando cobro...' : 'Cobrar y liberar mesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
