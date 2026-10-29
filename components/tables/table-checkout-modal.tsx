'use client';

import { useMemo, useState } from 'react';
import {
  X,
  Banknote,
  Smartphone,
  CreditCard,
  Plus,
  Minus,
  Lock,
  Check,
  Trash2,
  AlertTriangle,
  Utensils,
} from 'lucide-react';
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
  isServido?: boolean;
};

export function TableCheckoutModal({
  order,
  onClose,
  onSuccess,
  onAddMoreDishes,
  initialKeepTableOccupied = false,
}: {
  order: TableOrderDetails;
  onClose: () => void;
  onSuccess: () => void;
  onAddMoreDishes?: () => void;
  initialKeepTableOccupied?: boolean;
}) {
  const [currentItems, setCurrentItems] = useState<OrderItem[]>(order.items);
  const [tipPercent, setTipPercent] = useState<number | 'custom'>(10);
  const [customTipDollars, setCustomTipDollars] = useState('');
  const [splitPersons, setSplitPersons] = useState<number>(1);
  const [payMethod, setPayMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo');
  const [cashGivenDollars, setCashGivenDollars] = useState('');
  const isFoodNotServed = order.isServido === false;
  const [keepTableOccupied, setKeepTableOccupied] = useState(
    isFoodNotServed ? true : initialKeepTableOccupied,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para anulación de platos que no se van a servir
  const [itemBeingRemoved, setItemBeingRemoved] = useState<OrderItem | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);
  const [removeNotice, setRemoveNotice] = useState('');

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

  // Subtotal recalculado en vivo según los platos vigentes
  const currentSubtotalCents = useMemo(() => {
    return currentItems.reduce((acc, it) => acc + it.unitPriceCents * it.quantity, 0);
  }, [currentItems]);

  // Cálculo de propina en centavos
  const tipCents = useMemo(() => {
    if (tipPercent === 'custom') {
      const parsed = parseFloat(customTipDollars.replace(',', '.'));
      return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100);
    }
    return Math.round((currentSubtotalCents * tipPercent) / 100);
  }, [currentSubtotalCents, tipPercent, customTipDollars]);

  const totalCents = currentSubtotalCents + tipCents;

  // División de cuenta
  const perPersonCents = Math.ceil(totalCents / Math.max(1, splitPersons));

  // Vuelto en efectivo
  const cashGivenCents = useMemo(() => {
    const parsed = parseFloat(cashGivenDollars.replace(',', '.'));
    return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100);
  }, [cashGivenDollars]);

  const changeCents = Math.max(0, cashGivenCents - totalCents);

  // Anular o retirar plato que no se va a servir
  const handleConfirmRemoveItem = async () => {
    if (!itemBeingRemoved) return;
    setIsRemovingItem(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${order.orderId}/items/${itemBeingRemoved.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo anular el plato.');
        setIsRemovingItem(false);
        setItemBeingRemoved(null);
        return;
      }

      setCurrentItems((prev) => prev.filter((it) => it.id !== itemBeingRemoved.id));
      setRemoveNotice(`Se anuló "${itemBeingRemoved.productName}" porque no se va a servir.`);
      setTimeout(() => setRemoveNotice(''), 5000);
      setItemBeingRemoved(null);
    } catch {
      setError('Error al comunicar la anulación del plato.');
    } finally {
      setIsRemovingItem(false);
    }
  };

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
          releaseTable: isFoodNotServed ? false : !keepTableOccupied,
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
        items: currentItems.map((it) => ({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-[#EAE5DE] bg-white shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#EAE5DE] px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#EAA228]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#EAA228]">
                {order.zone || 'Salón Principal'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#181C20] mt-0.5">
              Cierre de Cuenta · Mesa #{order.tableNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EAE5DE] text-[#666E7A] hover:text-[#181C20] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCheckout} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              ⚠️ {error}
            </div>
          )}

          {removeNotice && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{removeNotice}</span>
            </div>
          )}

          {/* Desglose de Consumo */}
          <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#666E7A]">
                Consumo de la mesa
              </p>
              {onAddMoreDishes && (
                <button
                  type="button"
                  onClick={onAddMoreDishes}
                  className="text-xs font-black text-[#EAA228] hover:text-[#D99318] flex items-center gap-1 cursor-pointer transition-colors"
                  title="El cliente desea pedir más platos antes de cerrar la cuenta"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar más platos</span>
                </button>
              )}
            </div>

            {/* Aviso de confirmación de anulación */}
            {itemBeingRemoved && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2 text-rose-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <p className="font-bold">¿Confirmas que este plato no se va a servir?</p>
                    <p className="text-[11px] text-rose-700/80">
                      Se anulará <strong>{itemBeingRemoved.quantity}× {itemBeingRemoved.productName}</strong> y se restará de la cuenta.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setItemBeingRemoved(null)}
                    disabled={isRemovingItem}
                    className="px-2.5 py-1 rounded-lg border border-[#EAE5DE] bg-white text-xs font-bold text-[#181C20] hover:bg-[#FAF7F2] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRemoveItem}
                    disabled={isRemovingItem}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white cursor-pointer shadow-2xs"
                  >
                    {isRemovingItem ? 'Anulando...' : 'Sí, anular (no servir)'}
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-40 overflow-y-auto divide-y divide-[#EAE5DE] text-xs">
              {currentItems.length === 0 ? (
                <p className="py-3 text-center text-xs text-[#8C95A3] italic">
                  Todos los platos fueron anulados.
                </p>
              ) : (
                currentItems.map((it) => (
                  <div key={it.id} className="flex items-center justify-between py-2 group">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-[#EAA228]/20 text-[#181C20] font-black text-[11px]">
                        {it.quantity}×
                      </span>
                      <span className="text-[#181C20] font-bold truncate">
                        {it.productName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-mono font-black text-[#181C20]">
                        ${((it.unitPriceCents * it.quantity) / 100).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setItemBeingRemoved(it)}
                        className="text-[#8C95A3] hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors cursor-pointer"
                        title="No se va a servir / Anular plato de la cuenta"
                        aria-label={`Anular plato ${it.productName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-[#EAE5DE] pt-2.5 flex justify-between text-xs font-black">
              <span className="text-[#666E7A]">Subtotal consumo:</span>
              <span className="font-mono text-[#181C20]">${(currentSubtotalCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Botón rápido si el cliente desea ordenar más */}
          {onAddMoreDishes && (
            <button
              type="button"
              onClick={onAddMoreDishes}
              className="h-10 w-full rounded-xl border border-[#EAE5DE] bg-[#FAF7F2] hover:bg-[#EAE5DE] text-xs font-black text-[#181C20] uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Utensils className="w-3.5 h-3.5 text-[#EAA228]" />
              <span>Cliente pide más platos (Volver al comandero)</span>
            </button>
          )}

          {/* Propina */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#666E7A]">
              Propina sugerida
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 5, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTipPercent(pct)}
                  className={`h-10 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    tipPercent === pct
                      ? 'border-[#EAA228] bg-[#EAA228] text-[#181C20] shadow-xs'
                      : 'border-[#EAE5DE] bg-white text-[#666E7A] hover:bg-[#FAF7F2]'
                  }`}
                >
                  {pct === 0 ? 'Sin propina' : `${pct}%`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTipPercent('custom')}
                className={`h-10 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  tipPercent === 'custom'
                    ? 'border-[#EAA228] bg-[#EAA228] text-[#181C20] shadow-xs'
                    : 'border-[#EAE5DE] bg-white text-[#666E7A] hover:bg-[#FAF7F2]'
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
                className="mt-2 h-11 w-full rounded-xl border border-[#D9D3C7] bg-[#FAF7F2]/40 px-3.5 text-xs font-mono font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:border-transparent outline-none"
              />
            )}
          </div>

          {/* División de Cuenta Simple */}
          <div className="rounded-2xl border border-[#EAE5DE] bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#666E7A]">
                Dividir cuenta entre comensales
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSplitPersons(Math.max(1, splitPersons - 1))}
                  className="h-8 w-8 rounded-full border border-[#EAE5DE] flex items-center justify-center font-black text-[#181C20] hover:bg-[#FAF7F2] cursor-pointer"
                  aria-label="Restar persona"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center font-black text-sm text-[#181C20]">{splitPersons}</span>
                <button
                  type="button"
                  onClick={() => setSplitPersons(splitPersons + 1)}
                  className="h-8 w-8 rounded-full border border-[#EAE5DE] flex items-center justify-center font-black text-[#181C20] hover:bg-[#FAF7F2] cursor-pointer"
                  aria-label="Sumar persona"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {splitPersons > 1 && (
              <div className="rounded-xl border border-[#EAA228]/30 bg-[#FEF9EE] p-2.5 text-center text-xs font-black text-[#8F5E00]">
                Cada persona paga ${(perPersonCents / 100).toFixed(2)} USD
              </div>
            )}
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#666E7A]">
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
                const isSelected = payMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayMethod(m.id)}
                    className={`h-12 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#EAA228] bg-[#FEF9EE] text-[#181C20] ring-2 ring-[#EAA228]'
                        : 'border-[#EAE5DE] bg-white text-[#666E7A] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-[#EAA228]' : 'text-[#666E7A]'}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monto entregado y vuelto (si es efectivo) */}
          {payMethod === 'efectivo' && (
            <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4 space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#666E7A]">
                Efectivo recibido del cliente
              </label>
              <input
                type="text"
                placeholder={`Ej: ${Math.ceil(totalCents / 100)} o 20.00`}
                value={cashGivenDollars}
                onChange={(e) => setCashGivenDollars(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#D9D3C7] bg-white px-3.5 text-sm font-mono font-bold text-[#181C20] focus:ring-2 focus:ring-[#EAA228] focus:border-transparent outline-none"
              />
              {cashGivenCents > totalCents && (
                <div className="flex justify-between items-center pt-2 text-xs font-black text-[#8F5E00] bg-[#FEF9EE] p-2.5 rounded-xl border border-[#EAA228]/30">
                  <span>Vuelto a entregar:</span>
                  <span className="font-mono text-sm">${(changeCents / 100).toFixed(2)} USD</span>
                </div>
              )}
            </div>
          )}

          {/* Total Definitivo */}
          <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-[#666E7A]">Total a cobrar</p>
              <p className="text-[11px] text-[#8C95A3]">Incluye propina: ${(tipCents / 100).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-3xl font-black text-[#181C20]">
                ${(totalCents / 100).toFixed(2)}
              </span>
              <span className="block text-[10px] font-black text-[#8C95A3]">USD</span>
            </div>
          </div>

          {/* Modalidad de Cobro Anticipado / Pre-pago */}
          {isFoodNotServed ? (
            <div className="p-3.5 rounded-2xl border border-[#EAA228]/40 bg-[#FEF9EE] flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-[#EAA228]/20 text-[#181C20] flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs">
                <span className="font-black text-[#8F5E00] block">
                  Cobro anticipado (Mesa permanecerá ocupada)
                </span>
                <p className="text-[#666E7A] text-[11px] mt-0.5 leading-relaxed">
                  La comida aún no ha sido servida en mesa. Por seguridad operativa, <strong>la mesa continuará ocupada</strong> para que los comensales reciban sus platos. Podrás liberarla una vez servida.
                </p>
              </div>
            </div>
          ) : (
            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#EAE5DE] bg-white cursor-pointer hover:bg-[#FAF7F2] transition-colors">
              <input
                type="checkbox"
                checked={keepTableOccupied}
                onChange={(e) => setKeepTableOccupied(e.target.checked)}
                className="h-4 w-4 rounded accent-[#EAA228] cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-black text-[#181C20] block">
                  Mantener mesa ocupada tras cobrar
                </span>
                <p className="text-[#666E7A] text-[11px] mt-0.5">
                  {keepTableOccupied
                    ? 'La mesa continuará como OCUPADA en el salón mientras los comensales disfrutan sus platos.'
                    : 'La mesa se liberará de inmediato tras confirmar este cobro (los comensales ya se retiran).'}
                </p>
              </div>
            </label>
          )}

          {/* Botón de Confirmación */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting || currentItems.length === 0}
              className="h-12 w-full rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-xs font-black uppercase tracking-wider text-[#181C20] transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>
                {isSubmitting
                  ? 'Registrando cobro...'
                  : currentItems.length === 0
                    ? 'Comanda sin platos'
                    : isFoodNotServed || keepTableOccupied
                      ? `Cobrar $${(totalCents / 100).toFixed(2)} (Mesa Ocupada)`
                      : `Cobrar $${(totalCents / 100).toFixed(2)} y Liberar Mesa`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
