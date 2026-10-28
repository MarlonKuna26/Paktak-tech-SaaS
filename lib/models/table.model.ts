import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TableStatus } from '@/lib/tables/types';

export type CreateTableInput = {
  tableNumber: number;
  capacity: number;
  zone?: string | null;
};

export type UpdateTableInput = {
  tableNumber?: number;
  capacity?: number;
  zone?: string | null;
};

export type BatchTableInput = {
  startNumber: number;
  count: number;
  capacity: number;
  zone?: string | null;
};

export class TableModel {
  /**
   * Obtiene todas las mesas con detalle de reservas y comandas activas
   */
  static async listByRestaurant(restaurantId: string) {
    const supabase = await createSupabaseServerClient();

    // 1. Obtener mesas, reservas y órdenes en paralelo
    const [
      { data: tables, error: tablesError },
      { data: reservations },
      { data: activeOrders },
    ] = await Promise.all([
      supabase
        .from('tables')
        .select('id, restaurant_id, table_number, capacity, status, zone')
        .eq('restaurant_id', restaurantId)
        .order('table_number', { ascending: true }),
      supabase
        .from('reservations')
        .select('id, table_id, customer_name, customer_phone, date_time, guests, notes, status')
        .eq('restaurant_id', restaurantId)
        .not('table_id', 'is', null)
        .in('status', ['pendiente', 'confirmada']),
      supabase
        .from('orders')
        .select('id, table_id, order_number, status, total_cents, order_items(id, status)')
        .eq('restaurant_id', restaurantId)
        .in('status', ['abierta', 'en_espera', 'pagada'])
        .order('opened_at', { ascending: false }),
    ]);

    if (tablesError) throw new Error(tablesError.message);

    const reservationMap = new Map();
    for (const res of reservations ?? []) {
      if (res.table_id) {
        reservationMap.set(res.table_id, res);
      }
    }

    const orderMap = new Map();
    for (const ord of activeOrders ?? []) {
      if (!ord.table_id) continue;
      if (orderMap.has(ord.table_id)) continue;

      const rawItems = (ord.order_items || []) as Array<{ id: string; status: string }>;
      const totalItems = rawItems.length;
      const readyItems = rawItems.filter((it) => it.status === 'listo').length;
      const preparingItems = rawItems.filter((it) => it.status === 'preparando').length;
      const deliveredItems = rawItems.filter((it) => it.status === 'entregado').length;

      let kStatus: 'pendiente' | 'preparando' | 'listo' | 'servido' = 'pendiente';
      if (totalItems > 0 && readyItems > 0) {
        kStatus = 'listo';
      } else if (totalItems > 0 && deliveredItems === totalItems) {
        kStatus = 'servido';
      } else if (preparingItems > 0) {
        kStatus = 'preparando';
      }

      orderMap.set(ord.table_id, {
        id: ord.id,
        order_number: ord.order_number,
        status: ord.status,
        is_paid: ord.status === 'pagada',
        total_cents: ord.total_cents,
        kitchen_status: kStatus,
        items_count: totalItems,
        ready_items_count: readyItems,
      });
    }

    return (tables ?? []).map((t) => ({
      ...t,
      active_reservation: reservationMap.get(t.id) || null,
      active_order: t.status === 'ocupada' ? orderMap.get(t.id) || null : null,
    }));
  }

  /**
   * Crear una sola mesa
   */
  static async create(restaurantId: string, input: CreateTableInput) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        table_number: input.tableNumber,
        capacity: input.capacity,
        zone: input.zone ? input.zone.trim() : null,
        status: 'libre',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`La mesa #${input.tableNumber} ya existe.`);
      }
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Generar mesas en lote
   */
  static async createBatch(restaurantId: string, input: BatchTableInput) {
    const supabase = await createSupabaseServerClient();
    const { startNumber, count, capacity, zone } = input;

    const { data: existingTables } = await supabase
      .from('tables')
      .select('table_number')
      .eq('restaurant_id', restaurantId);

    const existingSet = new Set((existingTables || []).map((t) => t.table_number));

    const newRecords: Array<{
      restaurant_id: string;
      table_number: number;
      capacity: number;
      zone: string | null;
      status: 'libre';
    }> = [];

    for (let i = 0; i < count; i++) {
      const num = startNumber + i;
      if (existingSet.has(num)) continue;
      newRecords.push({
        restaurant_id: restaurantId,
        table_number: num,
        capacity,
        zone: zone || 'Salón Principal',
        status: 'libre',
      });
    }

    if (newRecords.length === 0) {
      throw new Error('Todas las mesas en este rango ya existen.');
    }

    const { data, error } = await supabase
      .from('tables')
      .insert(newRecords)
      .select();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Actualizar mesa
   */
  static async update(restaurantId: string, tableId: string, input: UpdateTableInput) {
    const supabase = await createSupabaseServerClient();
    const updates: Record<string, unknown> = {};
    if (input.tableNumber !== undefined) updates.table_number = input.tableNumber;
    if (input.capacity !== undefined) updates.capacity = input.capacity;
    if (input.zone !== undefined) updates.zone = input.zone;

    const { data, error } = await supabase
      .from('tables')
      .update(updates)
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('El número de mesa ya está en uso.');
      }
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Eliminar mesa (si no tiene comanda activa)
   */
  static async remove(restaurantId: string, tableId: string) {
    const supabase = await createSupabaseServerClient();

    const { data: openOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', tableId)
      .in('status', ['abierta', 'en_espera'])
      .limit(1);

    if (openOrders && openOrders.length > 0) {
      throw new Error('No se puede eliminar la mesa porque tiene una comanda activa. Cierra la cuenta o libera la mesa primero.');
    }

    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId);

    if (error) throw new Error(error.message);
    return true;
  }

  /**
   * Actualizar estado rápido (libre / ocupada / reservada)
   */
  static async updateStatus(restaurantId: string, tableId: string, status: TableStatus) {
    const supabase = await createSupabaseServerClient();

    if (status === 'libre') {
      // 1. Obtener la mesa y validar comanda activa
      const { data: tableData } = await supabase
        .from('tables')
        .select('id, table_number')
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId)
        .single();

      const tableNum = tableData?.table_number ? `#${tableData.table_number}` : '';

      // 2. Verificar si hay órdenes activas asociadas a esta mesa
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id, order_number, status, order_items(id, status)')
        .eq('table_id', tableId)
        .eq('restaurant_id', restaurantId)
        .in('status', ['abierta', 'pagada']);

      if (activeOrders && activeOrders.length > 0) {
        for (const ord of activeOrders) {
          const rawItems = (ord.order_items || []) as Array<{ id: string; status: string }>;
          const unservedItems = rawItems.filter((it) => it.status !== 'entregado');

          if (rawItems.length > 0 && unservedItems.length > 0) {
            throw new Error(
              `No se puede liberar la mesa ${tableNum}. La comanda #${ord.order_number} aún tiene comida pendiente de ser servida (${unservedItems.length} plato(s) en cocina/despacho). Debes marcar la comida como servida en mesa antes de liberar.`,
            );
          }

          if (ord.status === 'abierta') {
            throw new Error(
              `No se puede liberar la mesa ${tableNum}. La comanda #${ord.order_number} aún no ha sido cobrada. Por favor cobra la cuenta antes de liberar la mesa.`,
            );
          }
        }
      }
    }

    const { data: updatedTable, error: tableError } = await supabase
      .from('tables')
      .update({ status })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (tableError || !updatedTable) {
      throw new Error('No se pudo actualizar el estado de la mesa.');
    }

    if (status === 'libre') {
      await supabase
        .from('reservations')
        .update({ table_id: null })
        .eq('table_id', tableId)
        .eq('restaurant_id', restaurantId)
        .in('status', ['pendiente', 'confirmada']);
    }

    return updatedTable;
  }

  /**
   * Asignar reserva
   */
  static async assignReservation(restaurantId: string, tableId: string, reservationId: string) {
    const supabase = await createSupabaseServerClient();

    const { data: table } = await supabase
      .from('tables')
      .select('id, capacity, status')
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!table) throw new Error('Mesa no encontrada.');

    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, guests, status')
      .eq('id', reservationId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!reservation) throw new Error('Reserva no encontrada.');

    if (reservation.guests > table.capacity) {
      throw new Error(`La reserva es para ${reservation.guests} personas pero la mesa solo tiene capacidad para ${table.capacity}.`);
    }

    const { error: resErr } = await supabase
      .from('reservations')
      .update({ table_id: tableId, status: 'confirmada' })
      .eq('id', reservationId);

    if (resErr) throw new Error(resErr.message);

    const { error: tabErr } = await supabase
      .from('tables')
      .update({ status: 'reservada' })
      .eq('id', tableId);

    if (tabErr) throw new Error(tabErr.message);

    return true;
  }
}
