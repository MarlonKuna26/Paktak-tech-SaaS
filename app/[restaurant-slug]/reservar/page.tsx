import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PublicReservationForm } from '@/components/reservations/public-reservation-form';

export default function PublicReservationPage({
  params,
}: {
  params: Promise<{ 'restaurant-slug': string }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-muted/30" />}>
      <ReservationShell params={params} />
    </Suspense>
  );
}

async function ReservationShell({
  params,
}: {
  params: Promise<{ 'restaurant-slug': string }>;
}) {
  await connection();
  const { 'restaurant-slug': slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .in('status', ['trial', 'active'])
    .maybeSingle();

  if (!restaurant) notFound();

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Paktak Tech</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Reserva en {restaurant.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Completa el formulario y te confirmaremos tu reserva.
          </p>
        </div>
        <PublicReservationForm
          restaurantSlug={restaurant.slug}
          restaurantName={restaurant.name}
        />
      </div>
    </main>
  );
}
