'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type ReservationStatus =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'no_show'
  | 'completada';

type Reservation = {
  id: string;
  customer_name: string;
  customer_phone: string;
  date_time: string;
  guests: number;
  status: ReservationStatus;
  notes: string | null;
  source: string;
  created_at: string;
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  no_show: 'No se presentó',
  completada: 'Completada',
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-700',
  completada: 'bg-blue-100 text-blue-800',
};

function buildWhatsAppUrl(phone: string, name: string, dateTime: string, guests: number): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const date = new Date(dateTime);
  const dateStr = date.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const message = `Hola ${name}, le confirmamos su reserva para ${guests} persona${guests !== 1 ? 's' : ''} el ${dateStr} a las ${timeStr}. ¡Le esperamos! 🍽️`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function ReservationManager({ restaurantId }: { restaurantId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('reservations')
      .select(
        'id,customer_name,customer_phone,date_time,guests,status,notes,source,created_at',
      )
      .eq('restaurant_id', restaurantId)
      .order('date_time', { ascending: true });
    if (queryError) {
      setError('No se pudieron cargar las reservas.');
    } else {
      setReservations((data ?? []) as Reservation[]);
    }
  }, [restaurantId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function updateStatus(id: string, status: ReservationStatus) {
    setError('');
    const { error: updateError } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)
      .eq('restaurant_id', restaurantId);
    if (updateError) {
      setError('No se pudo actualizar la reserva.');
      return;
    }
    setMessage(`Reserva marcada como "${STATUS_LABELS[status]}".`);
    await load();
    setTimeout(() => setMessage(''), 3000);
  }

  const upcoming = reservations.filter(
    (r) => !['cancelada', 'no_show', 'completada'].includes(r.status),
  );
  const past = reservations.filter((r) =>
    ['cancelada', 'no_show', 'completada'].includes(r.status),
  );

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-md bg-primary/10 p-3 text-sm text-primary">
          {message}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximas reservas</h2>
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay reservas próximas.</p>
        )}
        <div className="space-y-3">
          {upcoming.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onUpdate={updateStatus}
            />
          ))}
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-muted-foreground">
            Historial
          </h2>
          <div className="space-y-3">
            {past.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onUpdate={updateStatus}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReservationCard({
  reservation: r,
  onUpdate,
}: {
  reservation: Reservation;
  onUpdate: (id: string, status: ReservationStatus) => Promise<void>;
}) {
  const date = new Date(r.date_time);
  const dateStr = date.toLocaleDateString('es-EC', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeStr = date.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{r.customer_name}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}
            >
              {STATUS_LABELS[r.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            📅 {dateStr} · {timeStr} &nbsp;|&nbsp; 👥 {r.guests} persona{r.guests !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-muted-foreground">📞 {r.customer_phone}</p>
          {r.notes && (
            <p className="text-sm text-muted-foreground">📝 {r.notes}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp con mensaje prellenado */}
          <a
            id={`btn-whatsapp-${r.id}`}
            href={buildWhatsAppUrl(r.customer_phone, r.customer_name, r.date_time, r.guests)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#25D366] px-3 text-sm font-medium text-white hover:opacity-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>

          {/* Botones de cambio de estado */}
          {r.status === 'pendiente' && (
            <>
              <button
                id={`btn-confirm-${r.id}`}
                onClick={() => void onUpdate(r.id, 'confirmada')}
                className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                Confirmar
              </button>
              <button
                id={`btn-cancel-${r.id}`}
                onClick={() => void onUpdate(r.id, 'cancelada')}
                className="h-9 rounded-md border border-destructive/30 px-3 text-sm text-destructive"
              >
                Cancelar
              </button>
            </>
          )}
          {r.status === 'confirmada' && (
            <>
              <button
                id={`btn-complete-${r.id}`}
                onClick={() => void onUpdate(r.id, 'completada')}
                className="h-9 rounded-md border px-3 text-sm"
              >
                Completada
              </button>
              <button
                id={`btn-noshow-${r.id}`}
                onClick={() => void onUpdate(r.id, 'no_show')}
                className="h-9 rounded-md border px-3 text-sm text-muted-foreground"
              >
                No se presentó
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
