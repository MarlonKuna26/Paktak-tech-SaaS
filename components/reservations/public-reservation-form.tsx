'use client';

import { useState } from 'react';

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
        text: body.message ?? `¡Reserva solicitada en ${restaurantName}! Te contactaremos para confirmar.`,
      });
    } catch {
      setResult({ ok: false, text: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <label htmlFor="reservation-name" className="mb-1 block text-sm font-medium">
            Nombre completo <span className="text-destructive">*</span>
          </label>
          <input
            id="reservation-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ej. María García"
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="reservation-phone" className="mb-1 block text-sm font-medium">
            Teléfono (WhatsApp) <span className="text-destructive">*</span>
          </label>
          <input
            id="reservation-phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Ej. 0987654321"
            type="tel"
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="reservation-datetime" className="mb-1 block text-sm font-medium">
            Fecha y hora <span className="text-destructive">*</span>
          </label>
          <input
            id="reservation-datetime"
            type="datetime-local"
            value={dateTime}
            min={MIN_DATE}
            onChange={(e) => setDateTime(e.target.value)}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="reservation-guests" className="mb-1 block text-sm font-medium">
            Número de personas <span className="text-destructive">*</span>
          </label>
          <input
            id="reservation-guests"
            type="number"
            min={1}
            max={30}
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Math.min(30, Number(e.target.value))))}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="reservation-notes" className="mb-1 block text-sm font-medium">
            Notas adicionales
          </label>
          <textarea
            id="reservation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alergias, ocasión especial, etc."
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {result && (
          <p
            role={result.ok ? 'status' : 'alert'}
            className={
              result.ok
                ? 'rounded-md bg-primary/10 p-3 text-sm text-primary'
                : 'rounded-md bg-destructive/10 p-3 text-sm text-destructive'
            }
          >
            {result.text}
          </p>
        )}

        <button
          id="btn-submit-reservation"
          onClick={() => void submitReservation()}
          disabled={isSubmitting}
          className="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando reserva...' : 'Solicitar reserva'}
        </button>
      </div>
    </section>
  );
}
