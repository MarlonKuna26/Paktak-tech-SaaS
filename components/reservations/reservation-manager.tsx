'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Users, Phone, FileText, Check, AlertCircle } from 'lucide-react';
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

const STATUS_BADGES: Record<ReservationStatus, string> = {
  pendiente: 'border-[#FFE6A5] bg-[#FFF8E7] text-[#9A6700]',
  confirmada: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]',
  cancelada: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
  no_show: 'border-[#E8E8E8] bg-[#F7F7F7] text-[#6B6B6B]',
  completada: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
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
  const message = `Hola ${name}, le confirmamos su reserva para ${guests} persona${guests !== 1 ? 's' : ''} el ${dateStr} a las ${timeStr}. Le esperamos en nuestro restaurante.`;
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
      .select('id,customer_name,customer_phone,date_time,guests,status,notes,source,created_at')
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
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm font-semibold text-[#B91C1C]"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {message && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-sm font-semibold text-[#15803D]"
        >
          <Check className="h-5 w-5 shrink-0" />
          <p>{message}</p>
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A]">Próximas reservas</h2>
          <p className="text-sm text-[#6B6B6B]">Mesas y horarios agendados por clientes.</p>
        </div>

        {upcoming.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-[#E8E8E8] bg-white p-8 text-center text-sm text-[#6B6B6B]">
            No hay reservas próximas registradas.
          </div>
        )}

        <div className="space-y-3">
          {upcoming.map((r) => (
            <ReservationCard key={r.id} reservation={r} onUpdate={updateStatus} />
          ))}
        </div>
      </section>

      {past.length > 0 && (
        <section className="space-y-4 border-t border-[#E8E8E8] pt-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#1A1A1A]">Historial de reservas</h2>
            <p className="text-sm text-[#6B6B6B]">Reservas completadas o canceladas.</p>
          </div>

          <div className="space-y-3">
            {past.map((r) => (
              <ReservationCard key={r.id} reservation={r} onUpdate={updateStatus} />
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
    <article className="rounded-[24px] border border-[#E8E8E8] bg-white p-5 md:p-6 transition-colors hover:border-[#1A1A1A]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-extrabold text-[#1A1A1A]">{r.customer_name}</h3>
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                STATUS_BADGES[r.status]
              }`}
            >
              {STATUS_LABELS[r.status]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#6B6B6B]">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {dateStr} · {timeStr}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {r.guests} persona{r.guests !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {r.customer_phone}
            </span>
          </div>

          {r.notes && (
            <p className="flex items-center gap-1.5 text-xs text-[#6B6B6B]">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>{r.notes}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            id={`btn-whatsapp-${r.id}`}
            href={buildWhatsAppUrl(r.customer_phone, r.customer_name, r.date_time, r.guests)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#E8E8E8] bg-white px-4 text-xs font-bold text-[#1A1A1A] hover:bg-[#F7F7F7] transition-colors"
          >
            WhatsApp
          </a>

          {r.status === 'pendiente' && (
            <>
              <button
                id={`btn-confirm-${r.id}`}
                onClick={() => void onUpdate(r.id, 'confirmada')}
                className="h-10 rounded-full bg-[#FFC21A] px-5 text-xs font-extrabold text-[#1A1A1A] hover:opacity-90 transition-opacity"
              >
                Confirmar
              </button>
              <button
                id={`btn-cancel-${r.id}`}
                onClick={() => void onUpdate(r.id, 'cancelada')}
                className="h-10 rounded-full border border-[#E8E8E8] bg-white px-4 text-xs font-bold text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
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
                className="h-10 rounded-full border border-[#E8E8E8] bg-white px-4 text-xs font-bold text-[#15803D] hover:bg-[#F0FDF4] transition-colors"
              >
                Completada
              </button>
              <button
                id={`btn-noshow-${r.id}`}
                onClick={() => void onUpdate(r.id, 'no_show')}
                className="h-10 rounded-full border border-[#E8E8E8] bg-white px-4 text-xs font-bold text-[#6B6B6B] hover:bg-[#F7F7F7] transition-colors"
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
