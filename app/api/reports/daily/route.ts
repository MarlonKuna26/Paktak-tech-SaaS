import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_daily_sales_report', {
    p_restaurant_id: staff.restaurantId,
    p_target_date: targetDate,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ report: data });
}
