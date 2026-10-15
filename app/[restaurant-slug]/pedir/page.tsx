import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { PublicMenuProduct } from '@/lib/orders/types';
import { PublicOrderForm } from '@/components/orders/public-order-form';

export default function PublicOrderPage({ params }: { params: Promise<{ 'restaurant-slug': string }> }) {
  return <Suspense fallback={<main className="min-h-screen bg-muted/30" />}><PublicOrderShell params={params} /></Suspense>;
}

async function PublicOrderShell({ params }: { params: Promise<{ 'restaurant-slug': string }> }) {
  await connection();
  const { 'restaurant-slug': slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase.from('restaurants').select('id,name,slug,status').eq('slug', slug).in('status', ['trial', 'active']).maybeSingle();
  if (!restaurant) notFound();
  const { data: products } = await supabase.from('products').select('id,category_id,name,description,price_cents,station').eq('restaurant_id', restaurant.id).eq('active', true).order('name');
  return <main className="min-h-screen bg-muted/30 px-4 py-10"><div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm font-medium text-primary">Paktak Tech</p><h1 className="text-3xl font-semibold tracking-tight">Pide en {restaurant.name}</h1><p className="mt-2 text-muted-foreground">Agrega productos al carrito y envía tu pedido al restaurante.</p></div><PublicOrderForm restaurantSlug={restaurant.slug} products={(products ?? []) as PublicMenuProduct[]} /></div></main>;
}
