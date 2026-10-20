-- Migration: 20261020120000_saas_onboarding.sql
-- Fase 9: Onboarding SaaS, Wizard de alta con período de prueba y verificación de suscripción

-- 1. Función RPC para dar de alta un nuevo restaurante completo con su dueño, mesas iniciales y menú
create or replace function public.onboard_new_restaurant(
  p_restaurant_name text,
  p_restaurant_slug text,
  p_phone text default null,
  p_address text default null,
  p_tables_count integer default 6,
  p_initial_categories jsonb default '["Platos Fuertes", "Bebidas", "Postres"]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_restaurant_id uuid;
  v_clean_slug text;
  v_trial_ends timestamptz;
  v_table_num integer;
  v_cat_name text;
  v_cat_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesión para registrar un restaurante';
  end if;

  v_clean_slug := lower(trim(p_restaurant_slug));

  -- Validar formato del slug
  if v_clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22000', message = 'El slug contiene caracteres inválidos. Usa solo letras minúsculas, números y guiones.';
  end if;

  -- Validar si el slug ya existe
  if exists (select 1 from public.restaurants where slug = v_clean_slug) then
    raise exception using errcode = '23505', message = 'El identificador web (slug) ya está registrado por otro restaurante.';
  end if;

  v_trial_ends := now() + interval '14 days';

  -- 1. Crear restaurante
  insert into public.restaurants (
    name,
    slug,
    plan,
    status,
    trial_ends_at,
    settings
  ) values (
    trim(p_restaurant_name),
    v_clean_slug,
    'basic',
    'trial',
    v_trial_ends,
    jsonb_build_object(
      'phone', coalesce(p_phone, ''),
      'address', coalesce(p_address, 'Ecuador'),
      'onboarded_at', now()
    )
  )
  returning id into v_restaurant_id;

  -- 2. Crear membresía staff como Owner
  insert into public.staff_members (
    user_id,
    restaurant_id,
    role,
    active
  ) values (
    v_user_id,
    v_restaurant_id,
    'owner',
    true
  );

  -- 3. Crear mesas iniciales del salón (1 a N)
  if p_tables_count > 0 then
    for v_table_num in 1..least(p_tables_count, 30) loop
      insert into public.tables (
        restaurant_id,
        table_number,
        capacity,
        status,
        zone
      ) values (
        v_restaurant_id,
        v_table_num,
        4,
        'libre',
        'Salón Principal'
      );
    end loop;
  end if;

  -- 4. Crear categorías base iniciales
  if p_initial_categories is not null and jsonb_array_length(p_initial_categories) > 0 then
    for v_table_num in 0..(jsonb_array_length(p_initial_categories) - 1) loop
      v_cat_name := p_initial_categories->>v_table_num;
      if v_cat_name is not null and trim(v_cat_name) <> '' then
        insert into public.categories (
          restaurant_id,
          name,
          sort_order
        ) values (
          v_restaurant_id,
          trim(v_cat_name),
          v_table_num + 1
        )
        returning id into v_cat_id;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'success', true,
    'restaurant_id', v_restaurant_id,
    'slug', v_clean_slug,
    'name', p_restaurant_name,
    'plan', 'basic',
    'status', 'trial',
    'trial_ends_at', v_trial_ends
  );
end;
$$;

revoke all on function public.onboard_new_restaurant(text, text, text, text, integer, jsonb) from public;
grant execute on function public.onboard_new_restaurant(text, text, text, text, integer, jsonb) to authenticated;

-- 2. Función RPC para consultar el estado de la suscripción del restaurante actual
create or replace function public.get_restaurant_subscription_status(p_restaurant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant record;
  v_days_left integer := 0;
  v_is_active boolean := false;
begin
  select id, name, slug, plan, status, trial_ends_at
  into v_restaurant
  from public.restaurants
  where id = p_restaurant_id;

  if not found then
    return jsonb_build_object('error', 'Restaurante no encontrado');
  end if;

  if v_restaurant.status = 'active' then
    v_is_active := true;
  elsif v_restaurant.status = 'trial' then
    if v_restaurant.trial_ends_at is not null and v_restaurant.trial_ends_at > now() then
      v_is_active := true;
      v_days_left := greatest(0, ceil(extract(epoch from (v_restaurant.trial_ends_at - now())) / 86400)::integer);
    else
      v_is_active := false;
      v_days_left := 0;
    end if;
  else
    v_is_active := false;
  end if;

  return jsonb_build_object(
    'restaurant_id', v_restaurant.id,
    'name', v_restaurant.name,
    'slug', v_restaurant.slug,
    'plan', v_restaurant.plan,
    'status', v_restaurant.status,
    'is_active', v_is_active,
    'trial_days_left', v_days_left,
    'trial_ends_at', v_restaurant.trial_ends_at
  );
end;
$$;

revoke all on function public.get_restaurant_subscription_status(uuid) from public;
grant execute on function public.get_restaurant_subscription_status(uuid) to authenticated;
