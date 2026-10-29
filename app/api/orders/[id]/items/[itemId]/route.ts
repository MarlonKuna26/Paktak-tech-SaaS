import { NextResponse } from 'next/server';
import { getCurrentStaff } from '@/lib/auth/get-current-staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; itemId: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff || !['owner', 'admin', 'host', 'cashier', 'waiter'].includes(staff.role)) {
    return NextResponse.json({ error: 'No autorizado para anular platos.' }, { status: 403 });
  }

  const { id: orderId, itemId } = await props.params;
  const url = new URL(request.url);
  const reduceOne = url.searchParams.get('reduce') === 'true';

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('void_order_item', {
      p_order_id: orderId,
      p_item_id: itemId,
      p_reduce_one: reduceOne,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al anular plato.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

