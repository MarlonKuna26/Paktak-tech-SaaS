'use client';

import { useState } from 'react';
import Link from 'next/link';

type ReservationResult = {
  ok: boolean;
  text: string;
};

const MIN_DATE = new Date(Date.now() + 60 * 60 * 1000)
  .toISOString()
  .slice(0, 16);

export function PublicReservationForm({
  restaurantSlug,
  restaurantName,
}: {
  restaurantSlug: string;
  restaurantName: string;
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<ReservationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitReservation() {
    setResult(null);
    if (!customerName.trim() || !customerPhone.trim() || !dateTime) {
      setResult({ ok: false, text: 'Completa todos los campos obligatorios.' });
      return;
    }
    const dateValue = new Date(dateTime);
    if (dateValue <= new Date()) {
      setResult({ ok: false, text: 'La fecha y hora deben ser futuras.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug,
          customerName,
          customerPhone,
          dateTime: dateValue.toISOString(),
          guests,
          notes: notes || undefined,
        }),
      });
      const body = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setResult({ ok: false, text: body.error ?? 'No se pudo crear la reserva.' });
        return;
      }
      setCustomerName('');
      setCustomerPhone('');
      setDateTime('');
      setGuests(2);
      setNotes('');
      setResult({
        ok: true,
        text: body.message ?? '¡Reserva solicitada con éxito! El restaurante la confirmará a la brevedad.',
      });
    } catch {
      setResult({ ok: false, text: 'Error de red. Intenta nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-sm">
      <div className="mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          Reserva en {restaurantName}
        </span>
        <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5">
          Atención Hoy
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="reservation-customer-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Nombre y Apellido <span className="text-red-500">*</span>
          </label>
          <input
            id="reservation-customer-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label htmlFor="reservation-customer-phone" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Teléfono o WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            id="reservation-customer-phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+593 999999999"
            type="tel"
            className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="reservation-datetime" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Fecha y hora <span className="text-red-500">*</span>
            </label>
            <input
              id="reservation-datetime"
              type="datetime-local"
              value={dateTime}
              min={MIN_DATE}
              onChange={(e) => setDateTime(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="reservation-guests" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Comensales <span className="text-red-500">*</span>
            </label>
            <input
              id="reservation-guests"
              type="number"
              min={1}
              max={30}
              value={guests}
              onChange={(e) => setGuests(Math.max(1, Math.min(30, Number(e.target.value))))}
              className="h-11 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reservation-notes" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Notas u ocasión especial
          </label>
          <textarea
            id="reservation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cumpleaños, aniversario, mesa en terraza o alergias alimentarias..."
            rows={3}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {result && (
          <p
            role={result.ok ? 'status' : 'alert'}
            className={
              result.ok
                ? 'rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'
                : 'rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-medium text-red-600 dark:text-red-400'
            }
          >
            {result.text}
          </p>
        )}

        <button
          id="btn-submit-reservation"
          type="button"
          onClick={() => void submitReservation()}
          disabled={isSubmitting}
          className="w-full h-12 rounded-full bg-[#f3a806] hover:bg-[#e09804] text-zinc-950 font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? 'Enviando solicitud...' : 'Solicitar Reserva de Mesa'}
        </button>

        <div className="pt-2 text-center">
          <Link
            href={`/${restaurantSlug}/pedir`}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            ← Volver al Menú Digital
          </Link>
        </div>
      </div>
    </div>
  );
}
