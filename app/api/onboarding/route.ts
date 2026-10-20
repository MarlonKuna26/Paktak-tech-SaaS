import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Debes iniciar sesión para registrar tu restaurante.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name: string;
      slug: string;
      phone?: string;
      address?: string;
      tablesCount?: number;
      categories?: string[];
    };

    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json({ error: 'Ingresa un nombre de restaurante válido.' }, { status: 400 });
    }

    const cleanSlug = (body.slug || body.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!cleanSlug || cleanSlug.length < 2) {
      return NextResponse.json({ error: 'El identificador web (slug) es inválido.' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('onboard_new_restaurant', {
      p_restaurant_name: body.name.trim(),
      p_restaurant_slug: cleanSlug,
      p_phone: body.phone?.trim() || null,
      p_address: body.address?.trim() || null,
      p_tables_count: body.tablesCount ?? 6,
      p_initial_categories: body.categories ?? ['Platos Fuertes', 'Bebidas', 'Postres'],
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      restaurant: data,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
