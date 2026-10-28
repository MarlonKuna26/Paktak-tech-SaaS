import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PublicReservationForm } from '@/components/reservations/public-reservation-form';

export default function PublicReservationPage({
  params,
}: {
  params: Promise<{ 'restaurant-slug': string }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#FAF7F2]" />}>
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
    <main className="min-h-screen bg-[#FAF7F2] font-sans text-[#181C20] px-4 py-12 selection:bg-[#EAA228] selection:text-[#181C20]">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="space-y-2">
          <Link href={`/${restaurant.slug}/pedir`} className="inline-flex items-center gap-2 text-xs font-bold text-[#EAA228] hover:underline">
            ← Ver carta de {restaurant.name}
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-[#181C20]">
            Reserva tu mesa en {restaurant.name}
          </h1>
          <p className="text-xs text-[#666E7A]">
            Completa los datos de tu visita y el equipo del restaurante te confirmará de inmediato.
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
