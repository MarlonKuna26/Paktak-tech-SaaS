'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, X, UtensilsCrossed } from 'lucide-react';
import { getActiveOrder, type StoredActiveOrder } from '@/lib/orders/session';

export function ActiveOrderFloatingBanner() {
  const [activeOrder, setActiveOrder] = useState<StoredActiveOrder | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const order = getActiveOrder();
    if (order && order.trackingCode) {
      const isFinished = order.status === 'completado' || order.status === 'cancelado';
      if (!isFinished) {
        setActiveOrder(order);
      }
    }
  }, []);

  if (!activeOrder || isDismissed) return null;

  const targetToken = activeOrder.trackingToken || activeOrder.trackingCode;

  return (
    <aside
      aria-label="Notificación de pedido activo"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border-2 border-[#EAA228] bg-white p-4 shadow-[0_16px_40px_rgba(24,28,32,0.18)]">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAA228]/15 text-[#EAA228]">
            <Flame className="h-5 w-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#B87A14]">
                Pedido en curso
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-sm font-black text-[#181C20] truncate">
              Orden #{activeOrder.trackingCode}
              {activeOrder.restaurantName ? ` · ${activeOrder.restaurantName}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeOrder.restaurantSlug && (
            <Link
              href={`/${activeOrder.restaurantSlug}/pedir`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#EAE5DE] bg-[#FAF7F2] px-3 text-xs font-bold text-[#181C20] hover:bg-[#EAE5DE] transition-colors"
            >
              <UtensilsCrossed className="h-3.5 w-3.5 text-[#EAA228]" />
              <span className="hidden sm:inline">Carta</span>
            </Link>
          )}

          <Link
            href={`/pedido/${targetToken}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#EAA228] hover:bg-[#D99318] px-3.5 text-xs font-black text-[#181C20] shadow-sm transition-all"
          >
            <span>Ver pedido</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#666E7A] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

