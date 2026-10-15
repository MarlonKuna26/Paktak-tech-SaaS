import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const syncMutationSchema = z.object({
  id: z.string(),
  restaurantId: z.string().uuid(),
  actionType: z.enum(['CREATE_ORDER', 'ADD_ITEMS', 'UPDATE_STATUS']),
  payload: z.object({
    orderId: z.string().uuid(),
    tableId: z.string().uuid().optional(),
    tableNumber: z.number().int().optional(),
    waiterId: z.string().uuid(),
    items: z
      .array(
        z.object({
          id: z.string().uuid(),
          productId: z.string().uuid(),
          productName: z.string(),
          unitPriceCents: z.number().int().nonnegative(),
          quantity: z.number().int().positive(),
          notes: z.string().optional().nullable(),
        }),
      )
      .optional(),
    status: z.string().optional(),
    clientTimestamp: z.string(),
  }),
});

const syncBatchSchema = z.object({
  mutations: z.array(syncMutationSchema),
});

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'waiter'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = syncBatchSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Lote de sincronización inválido' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const processedIds: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const mutation of parsed.data.mutations) {
    // Verificar que la mutación corresponda al restaurante del staff
    if (mutation.restaurantId !== staff.restaurantId) {
      errors.push({ id: mutation.id, error: 'Restaurante no coincide' });
      continue;
    }

    try {
      if (mutation.actionType === 'CREATE_ORDER') {
        const { orderId, tableId, items } = mutation.payload;
        if (!tableId || !items?.length) {
          errors.push({ id: mutation.id, error: 'Datos incompletos para crear comanda' });
          continue;
        }

        // 1. Verificar si la orden ya existe (Idempotencia)
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('id', orderId)
          .eq('restaurant_id', staff.restaurantId)
          .maybeSingle();

        let orderNumber = existingOrder?.order_number;

        if (!existingOrder) {
          // Obtener el siguiente número secuencial de orden para este restaurante
          const { data: maxNumRow } = await supabase
            .from('orders')
            .select('order_number')
            .eq('restaurant_id', staff.restaurantId)
            .order('order_number', { ascending: false })
            .limit(1)
            .maybeSingle();

          orderNumber = (maxNumRow?.order_number || 0) + 1;

          const totalCents = items.reduce(
            (sum, item) => sum + item.unitPriceCents * item.quantity,
            0,
          );

          // Insertar la orden con el UUID generado en el cliente
          const { error: insertOrderErr } = await supabase.from('orders').insert({
            id: orderId,
            restaurant_id: staff.restaurantId,
            table_id: tableId,
            waiter_id: staff.id,
            order_number: orderNumber,
            subtotal_cents: totalCents,
            total_cents: totalCents,
            status: 'abierta',
          });

          if (insertOrderErr) {
            errors.push({ id: mutation.id, error: insertOrderErr.message });
            continue;
          }

          // Marcar la mesa como ocupada
          await supabase
            .from('tables')
            .update({ status: 'ocupada' })
            .eq('id', tableId)
            .eq('restaurant_id', staff.restaurantId);
        }

        // 2. Insertar los items de la orden (con sus UUIDs de cliente, evitando duplicados)
        if (items && items.length > 0) {
          for (const item of items) {
            await supabase
              .from('order_items')
              .upsert(
                {
                  id: item.id,
                  restaurant_id: staff.restaurantId,
                  order_id: orderId,
                  product_id: item.productId,
                  product_name: item.productName,
                  unit_price_cents: item.unitPriceCents,
                  quantity: item.quantity,
                  notes: item.notes || null,
                  status: 'pendiente',
                },
                { onConflict: 'restaurant_id, id', ignoreDuplicates: true },
              );
          }
        }

        processedIds.push(mutation.id);
      } else if (mutation.actionType === 'ADD_ITEMS') {
        const { orderId, items } = mutation.payload;
        if (items && items.length > 0) {
          for (const item of items) {
            await supabase
              .from('order_items')
              .upsert(
                {
                  id: item.id,
                  restaurant_id: staff.restaurantId,
                  order_id: orderId,
                  product_id: item.productId,
                  product_name: item.productName,
                  unit_price_cents: item.unitPriceCents,
                  quantity: item.quantity,
                  notes: item.notes || null,
                  status: 'pendiente',
                },
                { onConflict: 'restaurant_id, id', ignoreDuplicates: true },
              );
          }

          // Recalcular total de la orden
          const { data: allItems } = await supabase
            .from('order_items')
            .select('unit_price_cents, quantity')
            .eq('order_id', orderId)
            .eq('restaurant_id', staff.restaurantId);

          if (allItems) {
            const newTotal = allItems.reduce(
              (sum, it) => sum + it.unit_price_cents * it.quantity,
              0,
            );
            await supabase
              .from('orders')
              .update({ subtotal_cents: newTotal, total_cents: newTotal })
              .eq('id', orderId)
              .eq('restaurant_id', staff.restaurantId);
          }
        }
        processedIds.push(mutation.id);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido al procesar comanda';
      errors.push({ id: mutation.id, error: msg });
    }
  }

  return NextResponse.json({
    success: true,
    processedIds,
    errors,
  });
}
