'use client';

import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Minus, Plus, Trash2, X } from 'lucide-react';
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
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
        className="absolute inset-0 flex flex-col bg-white duration-200 animate-in slide-in-from-right sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[440px] sm:border-l sm:border-line"
      >
        <header className="flex h-16 items-center justify-between px-6 sm:h-[72px]">
          <h2 className="text-[24px] font-extrabold">Tu pedido</h2>
          <button type="button" onClick={onClose} className="btn-icon -mr-3" aria-label="Cerrar">
            <X className="h-6 w-6" strokeWidth={1.75} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <p className="text-lg text-muted-ink">Todavía no agregaste nada.</p>
              <button type="button" onClick={onClose} className="btn-secondary">
                Ver el menú
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {cart.map((item, index) => {
                const imageUrl = getProductImageUrl(item.name, item.category_name, item.image_url);
                const itemTotal = ((item.price_cents * item.quantity) / 100).toFixed(2);

                return (
                  <li key={`${item.id}-${item.notes}-${index}`} className="flex gap-4 py-6">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[20px] bg-surface">
                      <Image src={imageUrl} alt="" fill sizes="80px" className="object-cover" />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-extrabold leading-tight">{item.name}</h3>
                        <span className="text-lg font-extrabold">${itemTotal}</span>
                      </div>

                      {item.notes && (
                        <p className="line-clamp-2 text-[15px] text-muted-ink">{item.notes}</p>
                      )}

                      <div className="mt-2 flex items-center justify-between">
                        {onEditItem ? (
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="-ml-2 min-h-12 px-2 text-[15px] font-bold text-muted-ink underline-offset-4 hover:text-ink hover:underline"
                          >
                            Editar
                          </button>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center rounded-full border border-line">
                          <button
                            type="button"
                            onClick={() => onChangeQuantity(item.id, item.quantity - 1)}
                            className="btn-icon"
                            aria-label={item.quantity === 1 ? `Quitar ${item.name}` : `Quitar uno de ${item.name}`}
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="h-5 w-5" strokeWidth={1.75} />
                            ) : (
                              <Minus className="h-5 w-5" strokeWidth={2} />
                            )}
                          </button>
                          <span className="w-6 text-center text-lg font-extrabold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onChangeQuantity(item.id, item.quantity + 1)}
                            className="btn-icon"
                            aria-label={`Agregar otro ${item.name}`}
                          >
                            <Plus className="h-5 w-5" strokeWidth={2} />
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
          <footer className="space-y-4 border-t border-line px-6 py-6">
            <div className="flex items-baseline justify-between">
              <span className="text-lg text-muted-ink">Total</span>
              <span className="text-[32px] font-extrabold leading-none">${totalFormatted}</span>
            </div>
            <p className="text-secondary">Retiras y pagas en {restaurantName}.</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="btn-primary w-full"
            >
              Confirmar pedido
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
