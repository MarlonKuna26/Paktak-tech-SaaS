import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('reservations')
    .select('id, customer_name, customer_phone, date_time, guests, notes, status')
    .eq('restaurant_id', staff.restaurantId)
    .is('table_id', null)
    .in('status', ['pendiente', 'confirmada'])
    .order('date_time', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'No se pudieron consultar las reservas' }, { status: 500 });
  }

  return NextResponse.json({ reservations: data ?? [] });
}
