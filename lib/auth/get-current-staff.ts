import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type StaffRole = 'owner' | 'admin' | 'host' | 'waiter' | 'kitchen';

export type CurrentStaff = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  role: StaffRole;
};

// cache(): layout y página comparten una sola consulta por request.
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('staff_members')
    .select('id, role, restaurant_id, restaurants!inner(name, slug)')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const restaurant = Array.isArray(data.restaurants)
    ? data.restaurants[0]
    : data.restaurants;

  if (!restaurant) return null;

  return {
    id: data.id,
    restaurantId: data.restaurant_id,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
    role: data.role as StaffRole,
  };
});
