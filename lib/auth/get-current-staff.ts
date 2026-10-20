import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type StaffRole = 'owner' | 'admin' | 'host' | 'waiter' | 'kitchen';

export type CurrentStaff = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  role: StaffRole;
  plan?: string;
  status?: string;
  trialEndsAt?: string | null;
  isTrialExpired?: boolean;
  daysRemaining?: number;
};

type RestaurantStaffQuery = {
  id: string;
  role: string;
  restaurant_id: string;
  restaurants: {
    name: string;
    slug: string;
    plan?: string;
    status?: string;
    trial_ends_at?: string | null;
  } | Array<{
    name: string;
    slug: string;
    plan?: string;
    status?: string;
    trial_ends_at?: string | null;
  }> | null;
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
    .select('id, role, restaurant_id, restaurants!inner(name, slug, plan, status, trial_ends_at)')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const rawStaff = data as unknown as RestaurantStaffQuery;
  const restaurant = Array.isArray(rawStaff.restaurants)
    ? rawStaff.restaurants[0]
    : rawStaff.restaurants;

  if (!restaurant) return null;

  const isTrial = restaurant.status === 'trial';
  const trialEnds = restaurant.trial_ends_at ? new Date(restaurant.trial_ends_at).getTime() : 0;
  const now = Date.now();
  const isTrialExpired = isTrial && trialEnds > 0 && trialEnds < now;
  const daysRemaining = isTrial && trialEnds > now ? Math.ceil((trialEnds - now) / 86400000) : 0;

  return {
    id: rawStaff.id,
    restaurantId: rawStaff.restaurant_id,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
    role: rawStaff.role as StaffRole,
    plan: restaurant.plan || 'basic',
    status: restaurant.status || 'trial',
    trialEndsAt: restaurant.trial_ends_at,
    isTrialExpired,
    daysRemaining,
  };
});
