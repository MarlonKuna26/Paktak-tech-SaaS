'use client';

import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type AlertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'success' | 'info';
  actionButton?: {
    label: string;
    onClick: () => void;
  };
};

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = 'error',
  actionButton,
}: AlertModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const config = {
    error: {
      defaultTitle: 'Acción Requerida',
      icon: AlertTriangle,
      iconContainer: 'bg-rose-50 text-rose-600 border border-rose-200',
      buttonBg: 'bg-[#181C20] hover:bg-black text-white',
    },
    warning: {
      defaultTitle: 'Aviso del Sistema',
      icon: AlertCircle,
      iconContainer: 'bg-amber-50 text-[#EAA228] border border-amber-200',
      buttonBg: 'bg-[#EAA228] hover:bg-[#D99318] text-[#181C20]',
    },
    success: {
      defaultTitle: '¡Operación Exitosa!',
      icon: CheckCircle2,
      iconContainer: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    info: {
      defaultTitle: 'Información',
      icon: Info,
      iconContainer: 'bg-blue-50 text-blue-600 border border-blue-200',
      buttonBg: 'bg-[#181C20] hover:bg-black text-white',
    },
  }[variant];

  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-[28px] border border-[#EAE5DE] bg-white p-6 sm:p-7 shadow-2xl transition-all animate-in zoom-in-95 duration-200 font-sans space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ${config.iconContainer}`}>
              <Icon className="h-6 w-6 stroke-[2.3]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8C95A3]">
                Notificación del Sistema
              </span>
              <h3 className="text-lg font-black text-[#181C20] leading-tight">
                {title || config.defaultTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE5DE] text-[#666E7A] hover:bg-[#FAF7F2] hover:text-[#181C20] transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-[#EAE5DE] bg-[#FAF7F2] p-4 text-xs font-semibold text-[#181C20] leading-relaxed">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          {actionButton && (
            <button
              type="button"
              onClick={() => {
                actionButton.onClick();
                onClose();
              }}
              className="h-10 px-4 rounded-xl bg-[#EAA228] hover:bg-[#D99318] text-xs font-black text-[#181C20] uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>{actionButton.label}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`h-10 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer ${config.buttonBg}`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

