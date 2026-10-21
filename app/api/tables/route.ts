import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createTableSchema = z.object({
  tableNumber: z.number().int().positive().max(999),
  capacity: z.number().int().positive().max(50),
  zone: z.string().trim().max(50).optional().nullable(),
});

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  // 1. Obtener mesas del restaurante
  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('id, restaurant_id, table_number, capacity, status, zone')
    .eq('restaurant_id', staff.restaurantId)
    .order('table_number', { ascending: true });

  if (tablesError) {
    return NextResponse.json({ error: 'Error al consultar mesas' }, { status: 500 });
  }

  // 2. Obtener reservas asignadas a mesas activas
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, table_id, customer_name, customer_phone, date_time, guests, notes, status')
    .eq('restaurant_id', staff.restaurantId)
    .not('table_id', 'is', null)
    .in('status', ['pendiente', 'confirmada']);

  const reservationMap = new Map<string, NonNullable<typeof reservations>[0]>();
  for (const res of reservations ?? []) {
    if (res.table_id) {
      reservationMap.set(res.table_id, res);
    }
  }

  // 3. Obtener órdenes activas de mesas ocupadas con el estado de sus platos en cocina
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('id, table_id, order_number, status, total_cents, order_items(id, status)')
    .eq('restaurant_id', staff.restaurantId)
    .in('status', ['abierta', 'en_espera']);

  type ActiveOrderSummary = {
    id: string;
    order_number: number;
    total_cents: number;
    kitchen_status: 'pendiente' | 'preparando' | 'listo' | 'servido';
    items_count: number;
    ready_items_count: number;
  };

  const orderMap = new Map<string, ActiveOrderSummary>();
  for (const ord of activeOrders ?? []) {
    if (!ord.table_id) continue;
    const rawItems = (ord.order_items || []) as Array<{ id: string; status: string }>;
    const totalItems = rawItems.length;
    const readyItems = rawItems.filter((it) => it.status === 'listo').length;
    const preparingItems = rawItems.filter((it) => it.status === 'preparando').length;

    let kStatus: 'pendiente' | 'preparando' | 'listo' | 'servido' = 'pendiente';
    if (totalItems > 0 && readyItems > 0) {
      kStatus = 'listo';
    } else if (preparingItems > 0) {
      kStatus = 'preparando';
    }

    orderMap.set(ord.table_id, {
      id: ord.id,
      order_number: ord.order_number,
      total_cents: ord.total_cents,
      kitchen_status: kStatus,
      items_count: totalItems,
      ready_items_count: readyItems,
    });
  }

  const tablesWithDetails = (tables ?? []).map((t) => ({
    ...t,
    active_reservation: reservationMap.get(t.id) || null,
    active_order: orderMap.get(t.id) || null,
  }));

  return NextResponse.json({ tables: tablesWithDetails });
}

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin'].includes(staff.role)) {
    return NextResponse.json({ error: 'Solo el administrador puede crear nuevas mesas' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createTableSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de mesa inválidos. Verifica número y capacidad.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tables')
    .insert({
      restaurant_id: staff.restaurantId,
      table_number: parsed.data.tableNumber,
      capacity: parsed.data.capacity,
      zone: parsed.data.zone ? parsed.data.zone.trim() : null,
      status: 'libre',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `La mesa #${parsed.data.tableNumber} ya existe.` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ table: data }, { status: 201 });
}
