import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  paymentMethod: z.enum(['efectivo', 'transferencia', 'tarjeta', 'otro']),
  tipCents: z.number().int().nonnegative().default(0),
  paidCents: z.number().int().nonnegative().default(0),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'waiter', 'host'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos de cobro inválidos', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('checkout_table_order', {
    p_order_id: id,
    p_payment_method: parsed.data.paymentMethod,
    p_tip_cents: parsed.data.tipCents,
    p_paid_cents: parsed.data.paidCents,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, result: data });
}
