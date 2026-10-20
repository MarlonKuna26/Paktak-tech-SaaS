'use client';

import { useMemo } from 'react';
import Image from 'next/image';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <aside aria-label="Carrito de compras" className="w-screen max-w-md bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="relative border-b border-zinc-100 dark:border-zinc-800/80 px-6 py-4">
            <h2 className="text-center text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Carrito
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Cerrar carrito"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Store Location Bar */}
          <div className="flex items-center gap-2.5 px-6 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800/60">
            <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Retirar En {restaurantName}
            </span>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-2xl mb-3">
                  🛍️
                </div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Tu carrito está vacío</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
                  Agrega deliciosos platos de nuestro menú para comenzar tu pedido.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const imageUrl = getProductImageUrl(item.name, item.category_name, item.image_url);
                const itemTotal = ((item.price_cents * item.quantity) / 100).toFixed(2);

                return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-3.5">
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
                      <Image
                        src={imageUrl}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                          {item.name}
                        </h3>
                      </div>

                      {/* Notes / Custom options */}
                      {item.notes ? (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 italic">
                          {item.notes}
                        </p>
                      ) : (
                        item.description && (
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        )
                      )}

                      {/* Price & Stepper row */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            ${itemTotal}
                          </span>
                          {onEditItem && (
                            <button
                              type="button"
                              onClick={() => onEditItem(item)}
                              className="text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 p-0.5 transition-colors"
                              title="Editar notas del producto"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Stepper matching mockup [🗑 1 +] */}
                        <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-2xs">
                          {item.quantity === 1 ? (
                            <button
                              type="button"
                              onClick={() => onChangeQuantity(item.id, 0)}
                              className="px-2 py-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              aria-label="Eliminar"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onChangeQuantity(item.id, item.quantity - 1)}
                              className="px-2 py-1 text-zinc-600 dark:text-zinc-300 hover:text-black font-semibold text-xs transition-colors"
                              aria-label="Disminuir"
                            >
                              -
                            </button>
                          )}

                          <span className="w-6 text-center text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => onChangeQuantity(item.id, item.quantity + 1)}
                            className="px-2 py-1 text-zinc-600 dark:text-zinc-300 hover:text-black font-semibold text-xs transition-colors"
                            aria-label="Aumentar"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer CTA */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCheckout();
                }}
                className="w-full h-12 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                Pagar ${totalFormatted}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
