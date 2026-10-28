'use client';

import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem } from '@/lib/orders/types';
import { getProductImageUrl } from '@/lib/orders/product-images';

export function CartDrawer({
  isOpen,
  onClose,
  onCheckout,
  cart,
  restaurantName,
  onChangeQuantity,
  onEditItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  cart: CartItem[];
  restaurantName: string;
  onChangeQuantity: (productId: string, newQty: number) => void;
  onEditItem?: (item: CartItem) => void;
}) {
  const totalCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
    [cart],
  );

  const totalFormatted = (totalCents / 100).toFixed(2);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200" onClick={onClose} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
        className="absolute inset-0 flex flex-col bg-white duration-300 animate-in slide-in-from-right sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[440px] sm:border-l sm:border-[#EAE5DE] sm:shadow-2xl font-sans"
      >
        <header className="flex h-18 items-center justify-between px-6 border-b border-[#EAE5DE]">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#181C20] tracking-tight">Tu pedido</h2>
            <p className="text-xs text-[#666E7A] font-medium">{restaurantName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-[#EAE5DE] flex items-center justify-center text-[#666E7A] hover:text-[#181C20] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center py-16">
              <div className="w-16 h-16 rounded-3xl bg-[#FAF7F2] border border-[#EAE5DE] flex items-center justify-center text-[#8C95A3]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-[#181C20]">Tu pedido está vacío.</p>
              <p className="text-xs text-[#666E7A] max-w-xs leading-relaxed">
                Elige deliciosos platos y bebidas del menú para comenzar a armar tu orden.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 h-11 px-6 rounded-full border border-[#EAE5DE] bg-[#FAF7F2] text-xs font-bold text-[#181C20] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
              >
                Volver al menú
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#EAE5DE]">
              {cart.map((item, index) => {
                const imageUrl = getProductImageUrl(item.name, item.category_name, item.image_url);
                const itemTotal = ((item.price_cents * item.quantity) / 100).toFixed(2);

                return (
                  <li key={`${item.id}-${item.notes}-${index}`} className="flex gap-4 py-5 items-start">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#FAF7F2] border border-[#EAE5DE]">
                      <Image src={imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-black text-[#181C20] leading-snug">{item.name}</h3>
                        <span className="font-mono text-base font-black text-[#181C20] shrink-0">${itemTotal}</span>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-[#B87A14] font-semibold line-clamp-2 bg-[#FEF9EE] px-2 py-0.5 rounded-md border border-[#EAA228]/30 mt-0.5">
                          Nota: {item.notes}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        {onEditItem ? (
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="text-xs font-bold text-[#666E7A] hover:text-[#181C20] underline underline-offset-2 transition-colors cursor-pointer"
                          >
                            Modificar nota
                          </button>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center rounded-full border border-[#EAE5DE] bg-[#FAF7F2] px-1 py-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onChangeQuantity(item.id, item.quantity - 1)}
                            className="h-7 w-7 rounded-full flex items-center justify-center text-[#181C20] hover:bg-white transition-colors cursor-pointer"
                            aria-label={item.quantity === 1 ? `Quitar ${item.name}` : `Quitar uno de ${item.name}`}
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" strokeWidth={2} />
                            ) : (
                              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            )}
                          </button>
                          <span className="w-7 text-center text-sm font-black text-[#181C20]">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onChangeQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7 rounded-full flex items-center justify-center text-[#181C20] hover:bg-white transition-colors cursor-pointer"
                            aria-label={`Agregar otro ${item.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="space-y-4 border-t border-[#EAE5DE] px-6 py-6 bg-[#FAF7F2]/60">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-[#666E7A]">Total a pagar</span>
              <span className="text-3xl font-black text-[#181C20] leading-none tracking-tight">${totalFormatted}</span>
            </div>
            <p className="text-xs text-[#8C95A3] font-medium">Precios en dólares estadounidenses (USD).</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="w-full h-13 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <span>Confirmar y enviar pedido →</span>
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
