import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const reservationSchema = z.object({
  restaurantSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(30),
  dateTime: z.string().datetime(),
  guests: z.number().int().min(1).max(30),
  notes: z.string().trim().max(500).optional(),
});

// Simple in-memory rate limiter (resets on server restart – ok for MVP)
const requests = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();

  const parsed = reservationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Revisa los datos del formulario.' },
      { status: 400 },
    );
  }

  // Rate limit: 5 reservations per IP per 10 minutes
  const current = requests.get(ip);
  if (current && current.resetAt > now && current.count >= 5) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' },
      { status: 429 },
    );
  }
  requests.set(
    ip,
    current && current.resetAt > now
      ? { ...current, count: current.count + 1 }
      : { count: 1, resetAt: now + 10 * 60_000 },
  );

  const { restaurantSlug, customerName, customerPhone, dateTime, guests, notes } =
    parsed.data;

  const reservationDate = new Date(dateTime);
  if (reservationDate <= new Date()) {
    return NextResponse.json(
      { error: 'La reserva debe ser para una fecha y hora futura.' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_public_reservation', {
    restaurant_slug: restaurantSlug,
    customer_name: customerName,
    customer_phone: customerPhone,
    reservation_date_time: dateTime,
    guest_count: guests,
    reservation_notes: notes ?? null,
    captcha_token: null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      reservation: data,
      message:
        '¡Reserva solicitada! El restaurante confirmará a la brevedad.',
    },
    { status: 201 },
  );
}
