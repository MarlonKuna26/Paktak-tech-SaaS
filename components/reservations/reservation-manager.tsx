'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Users, Phone, FileText, Check, AlertCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { AlertModal } from '@/components/ui/alert-modal';

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
  pendiente: 'border-[#F6E3B8] bg-[#FEF9EE] text-[#7A642B]',
  confirmada: 'border-emerald-200 bg-[#EBF7EE] text-[#1E7E34]',
  cancelada: 'border-red-200 bg-red-50 text-red-700',
  no_show: 'border-[#EAE5DE] bg-[#FAF7F2] text-[#8C95A3]',
  completada: 'border-[#2D3540] bg-[#161A1E] text-white',
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
    <div className="space-y-6 font-sans text-[#181C20]">
      {/* Modal Central de Errores y Avisos de Reservas */}
      <AlertModal
        isOpen={Boolean(error)}
        title="Aviso de Reservas"
        message={error}
        variant="error"
        onClose={() => setError('')}
      />

      {/* Modal Central de Éxito de Reservas */}
      <AlertModal
        isOpen={Boolean(message)}
        title="¡Reserva Actualizada!"
        message={message}
        variant="success"
        onClose={() => setMessage('')}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-[#181C20]">Próximas reservas</h2>
          <p className="text-xs text-[#666E7A]">Mesas y horarios agendados por clientes.</p>
        </div>

        {upcoming.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#D9D3C7] bg-white p-10 text-center text-xs font-semibold text-[#666E7A] shadow-xs">
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
        <section className="space-y-4 border-t border-[#EAE5DE] pt-6">
          <div>
            <h2 className="text-xl font-black text-[#181C20]">Historial de reservas</h2>
            <p className="text-xs text-[#666E7A]">Reservas completadas o canceladas.</p>
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
    <article className="rounded-2xl border border-[#EAE5DE] bg-white p-5 md:p-6 shadow-xs transition-all hover:border-[#EAA228]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-black text-[#181C20]">{r.customer_name}</h3>
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-extrabold ${
                STATUS_BADGES[r.status]
              }`}
            >
              {STATUS_LABELS[r.status]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#666E7A]">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#EAA228]" />
              <span>{dateStr} · {timeStr}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#EAA228]" />
              <span>{r.guests} persona{r.guests !== 1 ? 's' : ''}</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <Phone className="h-3.5 w-3.5 text-[#EAA228]" />
              <span>{r.customer_phone}</span>
            </span>
          </div>

          {r.notes && (
            <p className="flex items-center gap-1.5 text-xs text-[#666E7A] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EAE5DE]">
              <FileText className="h-3.5 w-3.5 shrink-0 text-[#EAA228]" />
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
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#181C20] hover:bg-[#FAF7F2] transition-colors shadow-xs"
          >
            WhatsApp
          </a>

          {r.status === 'pendiente' && (
            <>
              <button
                id={`btn-confirm-${r.id}`}
                onClick={() => void onUpdate(r.id, 'confirmada')}
                className="h-10 rounded-xl bg-[#EAA228] px-5 text-xs font-black text-[#181C20] hover:bg-[#D99318] transition-colors shadow-xs cursor-pointer"
              >
                Confirmar
              </button>
              <button
                id={`btn-cancel-${r.id}`}
                onClick={() => void onUpdate(r.id, 'cancelada')}
                className="h-10 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors shadow-xs cursor-pointer"
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
                className="h-10 rounded-xl border border-emerald-200 bg-[#EBF7EE] px-4 text-xs font-black text-[#1E7E34] hover:bg-[#DDF2E2] transition-colors shadow-xs cursor-pointer"
              >
                Completada
              </button>
              <button
                id={`btn-noshow-${r.id}`}
                onClick={() => void onUpdate(r.id, 'no_show')}
                className="h-10 rounded-xl border border-[#D9D3C7] bg-white px-4 text-xs font-bold text-[#666E7A] hover:bg-[#FAF7F2] transition-colors shadow-xs cursor-pointer"
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
