import { createSupabaseServerClient } from '@/lib/supabase/server';
import { publicOrderSchema } from '@/lib/orders/schema';
import { NextResponse } from 'next/server';

const requests = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const parsed = publicOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los datos y agrega al menos un producto.' }, { status: 400 });
  }

  const itemsByProduct = new Map<string, { productId: string; quantity: number; notes?: string }>();
  for (const item of parsed.data.items) {
    const existing = itemsByProduct.get(item.productId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + item.quantity, 99);
      existing.notes = existing.notes || item.notes;
    } else {
      itemsByProduct.set(item.productId, { ...item });
    }
  }
  const items = [...itemsByProduct.values()].map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
    notes: item.notes,
  }));
  const current = requests.get(ip);
  if (current && current.resetAt > now && current.count >= 20) {
    return NextResponse.json({ error: 'Se alcanzó el límite temporal de pedidos. Intenta de nuevo más tarde.' }, { status: 429 });
  }
  requests.set(ip, current && current.resetAt > now
    ? { ...current, count: current.count + 1 }
    : { count: 1, resetAt: now + 10 * 60_000 });

  const captchaSecret = process.env.TURNSTILE_SECRET_KEY;
  if (captchaSecret) {
    if (!parsed.data.captchaToken) {
      return NextResponse.json({ error: 'Completa la verificación de seguridad.' }, { status: 400 });
    }
    const captchaResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: captchaSecret, response: parsed.data.captchaToken, remoteip: ip }),
    });
    const captchaResult = (await captchaResponse.json()) as { success?: boolean };
    if (!captchaResult.success) {
      return NextResponse.json({ error: 'No se pudo validar la verificación de seguridad.' }, { status: 400 });
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: tracking, error } = await supabase.rpc('create_public_order_v2', {
    restaurant_slug: parsed.data.restaurantSlug,
    customer_name: parsed.data.customerName,
    customer_phone: parsed.data.customerPhone,
    order_notes: parsed.data.notes ?? null,
    requested_items: items,
    captcha_token: parsed.data.captchaToken ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({
    tracking,
    message: 'Pedido recibido. El restaurante confirmará tu solicitud.',
  }, { status: 201 });
}
