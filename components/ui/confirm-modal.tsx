'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Check, Info, X } from 'lucide-react';

export type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'orange' | 'danger' | 'info';
  isLoading?: boolean;
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'orange',
  isLoading = false,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  async function handleConfirmClick() {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  const isBusy = isLoading || loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200 font-sans"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[#EAA228] shadow-2xs">
            {variant === 'danger' ? (
              <AlertTriangle className="h-5 w-5 stroke-[2.3] text-[#ea580c]" />
            ) : variant === 'info' ? (
              <Info className="h-5 w-5 stroke-[2.3] text-[#EAA228]" />
            ) : (
              <AlertCircle className="h-5 w-5 stroke-[2.3] text-[#EAA228]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="h-9 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleConfirmClick()}
            className="h-9 rounded-full bg-[#EAA228] hover:bg-[#D99318] text-zinc-950 px-5 text-xs font-black shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isBusy ? (
              <span>Procesando...</span>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
