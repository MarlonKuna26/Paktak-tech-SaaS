import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const syncItemSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  product_id: z.string().optional(),
  productName: z.string().optional(),
  unitPriceCents: z.number().int().nonnegative().optional(),
  quantity: z.number().int().positive(),
  notes: z.string().optional().nullable(),
});

const syncMutationSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  actionType: z.enum(['CREATE_ORDER', 'ADD_ITEMS', 'UPDATE_STATUS']),
  payload: z.object({
    orderId: z.string(),
    tableId: z.string().optional(),
    tableNumber: z.number().int().optional(),
    waiterId: z.string().optional(),
    items: z.array(syncItemSchema).optional(),
    status: z.string().optional(),
    clientTimestamp: z.string().optional(),
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
    return NextResponse.json(
      { error: 'Lote de sincronización inválido', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const processedIds: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const mutation of parsed.data.mutations) {
    if (mutation.restaurantId !== staff.restaurantId) {
      errors.push({ id: mutation.id, error: 'Restaurante no coincide' });
      continue;
    }

    try {
      if (mutation.actionType === 'CREATE_ORDER' || mutation.actionType === 'ADD_ITEMS') {
        const { orderId, tableId, items } = mutation.payload;

        const formattedItems = (items || []).map((it) => ({
          id: it.id,
          product_id: it.productId || it.product_id,
          quantity: it.quantity,
          notes: it.notes || null,
        }));

        const { error: rpcError } = await supabase.rpc('waiter_sync_order', {
          p_restaurant_id: staff.restaurantId,
          p_order_id: orderId,
          p_table_id: tableId || null,
          p_items: formattedItems,
          p_device_id: null,
        });

        if (rpcError) {
          errors.push({ id: mutation.id, error: rpcError.message });
        } else {
          processedIds.push(mutation.id);
        }
      } else {
        // Otros tipos de mutación (ej. UPDATE_STATUS)
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
