import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['libre', 'ocupada', 'reservada']),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host', 'waiter'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado para cambiar el estado de la mesa' }, { status: 403 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Actualizar el estado de la mesa
  const { data: updatedTable, error: tableError } = await supabase
    .from('tables')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .eq('restaurant_id', staff.restaurantId)
    .select()
    .single();

  if (tableError || !updatedTable) {
    return NextResponse.json({ error: 'No se pudo actualizar la mesa' }, { status: 400 });
  }

  // Si se libera la mesa, desvincular cualquier reserva activa asignada
  if (parsed.data.status === 'libre') {
    await supabase
      .from('reservations')
      .update({ table_id: null })
      .eq('table_id', id)
      .eq('restaurant_id', staff.restaurantId)
      .in('status', ['pendiente', 'confirmada']);
  }

  return NextResponse.json({ table: updatedTable });
}
