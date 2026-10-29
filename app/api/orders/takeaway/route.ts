import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const staffTakeawaySchema = z.object({
  customerName: z.string().trim().max(120).default('Cliente Para Llevar'),
  customerPhone: z.string().trim().max(30).default('Mostrador'),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
        notes: z.string().trim().max(250).optional().nullable(),
      }),
    )
    .min(1, 'Agrega al menos un producto'),
  payNow: z.boolean().default(false),
  paymentMethod: z.enum(['efectivo', 'transferencia', 'tarjeta', 'otro']).optional().nullable(),
  paidCents: z.number().int().nonnegative().optional().nullable(),
});

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host', 'cashier', 'waiter'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado para crear pedidos de mostrador.' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = staffTakeawaySchema.safeParse(json);

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || 'Datos del pedido inválidos';
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { customerName, customerPhone, notes, items, payNow, paymentMethod, paidCents } = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('create_staff_takeaway_order', {
      p_restaurant_id: staff.restaurantId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_notes: notes || null,
      p_items: items,
      p_pay_now: payNow,
      p_payment_method: paymentMethod || null,
      p_paid_cents: paidCents || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, order: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar pedido para llevar.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

