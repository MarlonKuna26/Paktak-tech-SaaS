import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const assignSchema = z.object({
  reservationId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado para asignar reservas' }, { status: 403 });
  }

  const { id: tableId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = assignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ID de reserva inválido' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // 1. Verificar que la mesa pertenezca al restaurante
  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id, table_number, capacity, status')
    .eq('id', tableId)
    .eq('restaurant_id', staff.restaurantId)
    .single();

  if (tableError || !table) {
    return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
  }

  // 2. Verificar que la reserva pertenezca al restaurante
  const { data: reservation, error: resError } = await supabase
    .from('reservations')
    .select('id, customer_name, guests, status')
    .eq('id', parsed.data.reservationId)
    .eq('restaurant_id', staff.restaurantId)
    .single();

  if (resError || !reservation) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
  }

  if (reservation.guests > table.capacity) {
    return NextResponse.json(
      { error: `La reserva es para ${reservation.guests} personas pero la mesa #${table.table_number} tiene capacidad para ${table.capacity}.` },
      { status: 400 },
    );
  }

  // 3. Asignar la reserva a la mesa y marcar la mesa como reservada
  const { error: updateResError } = await supabase
    .from('reservations')
    .update({ table_id: tableId, status: 'confirmada' })
    .eq('id', reservation.id)
    .eq('restaurant_id', staff.restaurantId);

  if (updateResError) {
    return NextResponse.json({ error: 'No se pudo vincular la reserva' }, { status: 400 });
  }

  const { data: updatedTable, error: updateTableError } = await supabase
    .from('tables')
    .update({ status: 'reservada' })
    .eq('id', tableId)
    .eq('restaurant_id', staff.restaurantId)
    .select()
    .single();

  if (updateTableError) {
    return NextResponse.json({ error: 'No se pudo actualizar el estado de la mesa' }, { status: 400 });
  }

  return NextResponse.json({
    table: updatedTable,
    message: `Reserva de ${reservation.customer_name} asignada a la Mesa #${table.table_number}`,
  });
}
