import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const kdsStatusSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
  status: z.enum(['pendiente', 'preparando', 'listo', 'entregado']),
});

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'kitchen', 'waiter'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = kdsStatusSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos de transición inválidos', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('kds_set_item_status', {
    p_item_ids: parsed.data.itemIds,
    p_status: parsed.data.status,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, updatedCount: data });
}
