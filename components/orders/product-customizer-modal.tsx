'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Minus, Plus, X } from 'lucide-react';
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

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuantity(initialQuantity);
      setNotes(initialNotes);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-product-name">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="card relative w-full max-w-lg overflow-hidden border border-line bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="btn-icon absolute right-4 top-4 z-10 bg-white/90 shadow-sm"
            aria-label="Cerrar detalle"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* Product Image */}
          <div className="relative h-56 w-full bg-surface sm:h-64">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
            <div className="space-y-1">
              {product.category_name && (
                <p className="text-[14px] font-bold uppercase tracking-wider text-muted-ink">
                  {product.category_name}
                </p>
              )}
              <h2 id="modal-product-name" className="text-[24px] font-extrabold text-ink sm:text-[28px]">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-secondary pt-1 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Custom Notes */}
            <div className="space-y-2">
              <label htmlFor="product-custom-notes" className="block text-base font-bold text-ink">
                Instrucciones especiales
              </label>
              <textarea
                id="product-custom-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Sin cebolla, aderezo aparte..."
                rows={3}
                maxLength={150}
                className="w-full rounded-2xl border border-line bg-white p-4 text-base text-ink placeholder:text-muted-ink focus:border-ink focus:outline-none"
              />
              <p className="text-right text-[13px] text-muted-ink">{notes.length}/150</p>
            </div>

            {/* Stepper + Primary Add CTA */}
            <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
              <div
                className="flex h-14 items-center justify-between rounded-full border border-line px-2 sm:w-44 shrink-0"
                role="group"
                aria-label="Cantidad"
              >
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="btn-icon"
                  aria-label="Quitar uno"
                >
                  <Minus className="h-5 w-5" strokeWidth={2} />
                </button>
                <span className="text-lg font-extrabold text-ink" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  className="btn-icon"
                  aria-label="Agregar otro"
                >
                  <Plus className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>

              <button
                type="submit"
                className="btn-primary w-full flex-1 justify-between sm:h-14"
              >
                <span>Agregar</span>
                <span className="font-extrabold">${totalFormatted}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
