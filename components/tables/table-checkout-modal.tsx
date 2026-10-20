'use client';

import { useMemo, useState } from 'react';
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
      setError('El efectivo entregado no puede ser menor al total.');
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

      // Preparar ticket térmico
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
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {order.zone || 'Salón'}
            </span>
            <h2 className="text-xl font-black">Cierre de Cuenta · Mesa #{order.tableNumber}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCheckout} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          {/* Desglose de Consumo */}
          <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
            <p className="text-xs font-bold uppercase text-muted-foreground">Consumo de la mesa</p>
            <div className="max-h-36 overflow-y-auto divide-y divide-border/40 text-xs">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <span className="font-bold text-primary mr-1.5">{it.quantity}x</span>
                    <span>{it.productName}</span>
                  </div>
                  <span className="font-mono font-semibold">
                    ${((it.unitPriceCents * it.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border/60 pt-2 flex justify-between text-xs font-bold">
              <span>Subtotal:</span>
              <span className="font-mono">${(order.subtotalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Propina */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Propina voluntaria</label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 5, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTipPercent(pct)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                    tipPercent === pct
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {pct === 0 ? 'Sin propina' : `${pct}%`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTipPercent('custom')}
                className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                  tipPercent === 'custom'
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'bg-background hover:bg-muted'
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
                className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}
          </div>

          {/* División de Cuenta Simple */}
          <div className="rounded-xl border bg-background p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Dividir cuenta (comensales)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSplitPersons(Math.max(1, splitPersons - 1))}
                  className="h-7 w-7 rounded-lg border font-bold hover:bg-muted"
                >
                  -
                </button>
                <span className="w-6 text-center font-bold text-sm">{splitPersons}</span>
                <button
                  type="button"
                  onClick={() => setSplitPersons(splitPersons + 1)}
                  className="h-7 w-7 rounded-lg border font-bold hover:bg-muted"
                >
                  +
                </button>
              </div>
            </div>
            {splitPersons > 1 && (
              <div className="rounded-lg bg-primary/10 p-2 text-center text-xs font-bold text-primary">
                👉 Cada persona paga: ${(perPersonCents / 100).toFixed(2)} USD
              </div>
            )}
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Método de cobro</label>
            <div className="grid grid-cols-3 gap-2">
              {(['efectivo', 'transferencia', 'tarjeta'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`rounded-xl border py-2.5 text-xs font-bold capitalize transition-all ${
                    payMethod === m
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {m === 'efectivo' ? '💵 Efectivo' : m === 'transferencia' ? '📲 Transfer.' : '💳 Tarjeta'}
                </button>
              ))}
            </div>
          </div>

          {/* Monto entregado y vuelto (si es efectivo) */}
          {payMethod === 'efectivo' && (
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <label className="block text-xs font-bold text-foreground">Efectivo entregado por el cliente</label>
              <input
                type="text"
                placeholder={`Ej: ${Math.ceil(totalCents / 100)} o 20.00`}
                value={cashGivenDollars}
                onChange={(e) => setCashGivenDollars(e.target.value)}
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm font-mono font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              />
              {cashGivenCents > totalCents && (
                <div className="flex justify-between items-center pt-1 text-sm font-black text-emerald-600 dark:text-emerald-400">
                  <span>🪙 Cambio / Vuelto:</span>
                  <span className="font-mono text-base">${(changeCents / 100).toFixed(2)} USD</span>
                </div>
              )}
            </div>
          )}

          {/* Total Definitivo */}
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Total a Cobrar</p>
              <p className="text-xs text-muted-foreground">Incluye propina: ${(tipCents / 100).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-3xl font-black text-foreground">
                ${(totalCents / 100).toFixed(2)}
              </span>
              <span className="block text-[10px] font-bold uppercase text-muted-foreground">USD</span>
            </div>
          </div>

          {/* Botón de Confirmación */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando cobro...' : '✓ Cobrar y Liberar Mesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
