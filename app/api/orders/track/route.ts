import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    code?: string;
    phone?: string;
  } | null;
  if (!body?.code?.trim() || !body.phone?.trim()) {
    return NextResponse.json({ error: 'Ingresa el código y teléfono del pedido.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_public_order', {
    order_code: body.code,
    phone_value: body.phone,
  });
  if (error) {
    return NextResponse.json({ error: 'No encontramos un pedido con esos datos.' }, { status: 404 });
  }
  return NextResponse.json({ order: data });
}
