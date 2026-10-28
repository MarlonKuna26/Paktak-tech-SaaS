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
      {/* Backdrop con blur suave */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-[#EAE5DE] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm border border-[#EAE5DE] flex items-center justify-center text-[#181C20] hover:bg-white shadow-xs transition-colors cursor-pointer"
            aria-label="Cerrar detalle"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>

          {/* Product Image */}
          <div className="relative h-60 w-full bg-[#FAF7F2] sm:h-68 border-b border-[#EAE5DE]">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
            />
            {product.station && (
              <div className="absolute bottom-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white border border-white/20">
                {product.station === 'barra' ? '🥤 Barra' : '🍳 Cocina'}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
            <div className="space-y-1.5">
              {product.category_name && (
                <span className="text-[11px] font-black uppercase tracking-wider text-[#B87A14] block">
                  {product.category_name}
                </span>
              )}
              <h2 id="modal-product-name" className="text-2xl sm:text-[26px] font-black text-[#181C20] leading-tight tracking-tight">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-xs sm:text-sm text-[#5A6370] pt-1 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Custom Notes */}
            <div className="space-y-2">
              <label htmlFor="product-custom-notes" className="block text-xs font-black uppercase tracking-wider text-[#181C20]">
                Instrucciones especiales para cocina
              </label>
              <textarea
                id="product-custom-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Sin cebolla, aderezo aparte, bien cocido..."
                rows={3}
                maxLength={150}
                className="w-full rounded-2xl border border-[#D9D3C7] bg-[#FAF7F2]/60 p-4 text-sm font-semibold text-[#181C20] placeholder:text-[#8C95A3] focus:bg-white focus:ring-2 focus:ring-[#EAA228] focus:border-transparent focus:outline-none transition-all resize-none"
              />
              <p className="text-right text-[11px] font-semibold text-[#8C95A3]">{notes.length}/150</p>
            </div>

            {/* Stepper + Primary Add CTA */}
            <div className="flex flex-col gap-3.5 border-t border-[#EAE5DE] pt-5 sm:flex-row sm:items-center">
              <div
                className="flex h-12 items-center justify-between rounded-full border border-[#EAE5DE] bg-[#FAF7F2] px-2 sm:w-40 shrink-0"
                role="group"
                aria-label="Cantidad"
              >
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-[#181C20] hover:bg-white transition-colors cursor-pointer"
                  aria-label="Quitar uno"
                >
                  <Minus className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <span className="w-8 text-center text-base font-black text-[#181C20]" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-[#181C20] hover:bg-white transition-colors cursor-pointer"
                  aria-label="Agregar otro"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>

              <button
                type="submit"
                className="w-full flex-1 h-12 px-6 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-[#181C20] font-black text-sm flex items-center justify-between shadow-xs transition-colors cursor-pointer"
              >
                <span>Agregar al pedido</span>
                <span className="font-mono text-base font-black">${totalFormatted}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
