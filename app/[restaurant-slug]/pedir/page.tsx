import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { PublicMenuCategory, PublicMenuProduct } from '@/lib/orders/types';
import { PublicOrderForm } from '@/components/orders/public-order-form';

export default function PublicOrderPage({ params }: { params: Promise<{ 'restaurant-slug': string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f8f9fa] dark:bg-zinc-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></main>}>
      <PublicOrderShell params={params} />
    </Suspense>
  );
}

async function PublicOrderShell({ params }: { params: Promise<{ 'restaurant-slug': string }> }) {
  await connection();
  const { 'restaurant-slug': slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, status, logo_url, settings')
    .eq('slug', slug)
    .in('status', ['trial', 'active'])
    .maybeSingle();

  if (!restaurant) notFound();

  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order', { ascending: true });

  const { data: productsData } = await supabase
    .from('products')
    .select('id, category_id, name, description, price_cents, station, category:categories(name)')
    .eq('restaurant_id', restaurant.id)
    .eq('active', true)
    .order('name');

  type RawProduct = {
    id: string;
    category_id: string | null;
    name: string;
    description: string | null;
    price_cents: number;
    station: 'cocina' | 'barra';
    category?: { name: string } | null;
  };

  const rawProducts = (productsData || []) as unknown as RawProduct[];

  const mappedProducts: PublicMenuProduct[] = rawProducts.map((p) => ({
    id: p.id,
    category_id: p.category_id,
    category_name: p.category?.name || null,
    name: p.name,
    description: p.description,
    price_cents: p.price_cents,
    station: p.station,
  }));

  const categories: PublicMenuCategory[] = (categoriesData || []).map((c) => ({
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
  }));

  return (
    <PublicOrderForm
      restaurantSlug={restaurant.slug}
      restaurantName={restaurant.name}
      restaurantLogo={restaurant.logo_url}
      categories={categories}
      products={mappedProducts}
    />
  );
}
