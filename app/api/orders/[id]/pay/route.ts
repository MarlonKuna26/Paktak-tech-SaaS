import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { z } from 'zod';

const paymentSchema = z.object({
  paymentMethod: z.enum(['efectivo', 'transferencia', 'tarjeta', 'otro']),
  paidAmountCents: z.number().int().nonnegative(),
  tokenNumber: z.string().trim().max(50).optional().nullable(),
  serviceType: z.enum(['paleta_madera', 'mesa_fija', 'para_llevar']).default('paleta_madera'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'kitchen', 'waiter', 'host'].includes(staff.role)) {
    return NextResponse.json({ error: 'No tienes permisos para registrar cobros.' }, { status: 403 });
  }

  const { id: orderId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = paymentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de pago inválidos.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('register_public_order_payment', {
    target_order_id: orderId,
    pay_method: parsed.data.paymentMethod,
    paid_cents: parsed.data.paidAmountCents,
    token_number: parsed.data.tokenNumber ?? null,
    target_service_type: parsed.data.serviceType,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ order: data });
}
