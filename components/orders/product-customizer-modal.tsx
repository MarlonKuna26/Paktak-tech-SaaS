'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { PublicMenuProduct } from '@/lib/orders/types';
import { getProductImageUrl } from '@/lib/orders/product-images';

export function ProductCustomizerModal({
  product,
  initialNotes = '',
  initialQuantity = 1,
  isOpen,
  onClose,
  onAddToCart,
}: {
  product: PublicMenuProduct | null;
  initialNotes?: string;
  initialQuantity?: number;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: PublicMenuProduct, quantity: number, notes: string) => void;
}) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [notes, setNotes] = useState(initialNotes);

  if (!isOpen || !product) return null;

  const imageUrl = getProductImageUrl(product.name, product.category_name, product.image_url);
  const totalCents = product.price_cents * quantity;
  const totalFormatted = (totalCents / 100).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddToCart(product, quantity, notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Product Image */}
          <div className="relative h-56 sm:h-64 w-full bg-zinc-100 dark:bg-zinc-800">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 512px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-6 right-6">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
                {product.category_name || 'Especialidad'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mt-0.5">
                {product.name}
              </h2>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {product.description && (
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Custom Notes / Instructions */}
            <div className="space-y-1.5">
              <label htmlFor="product-custom-notes" className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Instrucciones especiales o personalización:
              </label>
              <textarea
                id="product-custom-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Sin cebolla, salsa BBQ jalapeño aparte, etc."
                rows={2}
                maxLength={150}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-zinc-400 text-right">{notes.length}/150</p>
            </div>

            {/* Quantity Stepper & Add Button */}
            <div className="flex items-center gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold transition-colors"
                >
                  +
                </button>
              </div>

              <button
                type="submit"
                className="flex-1 h-12 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                Agregar al pedido · ${totalFormatted}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
