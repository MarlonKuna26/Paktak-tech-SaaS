import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const allowedStatuses = ['confirmado', 'rechazado', 'preparando', 'listo', 'completado'] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: string;
    reason?: string;
  } | null;
  if (!body?.status || !allowedStatuses.includes(body.status as (typeof allowedStatuses)[number])) {
    return NextResponse.json({ error: 'Transición de pedido inválida.' }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('transition_public_order', {
    order_id: id,
    next_status: body.status,
    reason: body.reason ?? null,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ order: data });
}
