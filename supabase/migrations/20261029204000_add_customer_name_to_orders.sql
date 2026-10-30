-- MIGRACIÓN: Soporte de Nombre de Cliente en Comandas de Mesas (Para evitar confusión en comprobantes)

-- 1. Agregar customer_name a la tabla orders si no existe
alter table public.orders
add column if not exists customer_name text default null;

-- Dropear firma anterior para permitir nueva firma con customer_name
drop function if exists public.waiter_sync_order(uuid, uuid, uuid, jsonb, text);

-- 2. Actualizar waiter_sync_order para recibir customer_name
create or replace function public.waiter_sync_order(
  p_restaurant_id uuid,
  p_order_id uuid,
  p_table_id uuid,
  p_items jsonb,
  p_device_id text default null,
  p_customer_name text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid;
  v_order_restaurant uuid;
  v_order_status public.order_status;
  v_order_number integer;
  v_item jsonb;
  v_qty integer;
  v_product_id uuid;
  v_product_name text;
  v_product_price integer;
  v_product_station public.product_station;
  v_clean_name text;
begin
  v_clean_name := nullif(trim(p_customer_name), '');

  -- Autorizar a dueños, administradores, anfitriones (superusuarios) y cajeros
  select sm.id into v_staff_id
  from public.staff_members sm
  where sm.user_id = (select auth.uid())
    and sm.restaurant_id = p_restaurant_id
    and sm.active
    and sm.role in ('owner', 'admin', 'host', 'cashier', 'waiter');

  if v_staff_id is null then
    raise exception using errcode = '42501', message = 'No autorizado para tomar o sincronizar comandas';
  end if;

  select o.restaurant_id, o.status, o.order_number
    into v_order_restaurant, v_order_status, v_order_number
  from public.orders o
  where o.id = p_order_id;

  if v_order_restaurant is not null and v_order_restaurant <> p_restaurant_id then
    raise exception using errcode = '42501', message = 'La orden pertenece a otro restaurante';
  end if;

  if v_order_restaurant is null then
    if p_table_id is null then
      raise exception using errcode = '22023', message = 'La comanda necesita una mesa';
    end if;

    perform 1 from public.tables t where t.id = p_table_id and t.restaurant_id = p_restaurant_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'Mesa no encontrada';
    end if;

    perform pg_advisory_xact_lock(hashtext('orders:' || p_restaurant_id::text));

    select coalesce(max(o.order_number), 0) + 1 into v_order_number
    from public.orders o
    where o.restaurant_id = p_restaurant_id;

    insert into public.orders (
      id, restaurant_id, table_id, waiter_id, order_number, status, device_id, customer_name
    )
    values (
      p_order_id, p_restaurant_id, p_table_id, v_staff_id, v_order_number, 'abierta', p_device_id, v_clean_name
    );

    update public.tables t
    set status = 'ocupada'
    where t.id = p_table_id and t.restaurant_id = p_restaurant_id;
  elsif v_order_status <> 'abierta' then
    raise exception using errcode = '22023', message = 'La orden ya está cerrada';
  else
    -- Si ya existe y se envía un nombre, actualizarlo si no tenía
    if v_clean_name is not null then
      update public.orders
      set customer_name = v_clean_name
      where id = p_order_id and (customer_name is null or customer_name = '');
    end if;
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception using errcode = '22023', message = 'Cantidad inválida';
    end if;

    select p.id, p.name, p.price_cents, p.station
      into v_product_id, v_product_name, v_product_price, v_product_station
    from public.products p
    where p.id = coalesce(nullif(v_item ->> 'product_id', ''), nullif(v_item ->> 'productId', ''))::uuid
      and p.restaurant_id = p_restaurant_id;

    if v_product_id is null then
      raise exception using errcode = 'P0002', message = 'Producto no encontrado en el menú';
    end if;

    insert into public.order_items (
      id, restaurant_id, order_id, product_id, product_name,
      unit_price_cents, quantity, notes, status, station
    )
    values (
      (v_item ->> 'id')::uuid, p_restaurant_id, p_order_id, v_product_id, v_product_name,
      v_product_price, v_qty, nullif(left(trim(coalesce(v_item ->> 'notes', '')), 200), ''),
      'pendiente', v_product_station
    )
    on conflict (id) do nothing;

    v_product_id := null;
  end loop;

  update public.orders o
  set subtotal_cents = t.total,
      total_cents = t.total + o.tax_cents + o.tip_cents
  from (
    select coalesce(sum(unit_price_cents * quantity), 0)::integer as total
    from public.order_items
    where order_id = p_order_id and restaurant_id = p_restaurant_id
  ) t
  where o.id = p_order_id;

  return v_order_number;
end;
$$;

revoke all on function public.waiter_sync_order(uuid, uuid, uuid, jsonb, text, text) from public;
grant execute on function public.waiter_sync_order(uuid, uuid, uuid, jsonb, text, text) to authenticated;

-- Overload para compatibilidad con llamadas de 5 argumentos
create or replace function public.waiter_sync_order(
  p_restaurant_id uuid,
  p_order_id uuid,
  p_table_id uuid,
  p_items jsonb,
  p_device_id text
)
returns integer
language sql
security definer
as $$
  select public.waiter_sync_order(p_restaurant_id, p_order_id, p_table_id, p_items, p_device_id, null::text);
$$;

revoke all on function public.waiter_sync_order(uuid, uuid, uuid, jsonb, text) from public;
grant execute on function public.waiter_sync_order(uuid, uuid, uuid, jsonb, text) to authenticated;

-- 3. Actualizar checkout_table_order para incluir customer_name en el retorno
create or replace function public.checkout_table_order(
  p_order_id uuid,
  p_payment_method public.payment_method,
  p_tip_cents integer default 0,
  p_paid_cents integer default 0,
  p_release_table boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_restaurant_id uuid;
  v_table_id uuid;
  v_subtotal integer;
  v_final_total integer;
  v_change_cents integer := 0;
  v_result jsonb;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Orden no encontrada';
  end if;

  v_restaurant_id := v_order.restaurant_id;
  v_table_id := v_order.table_id;

  if not public.has_restaurant_role(
    v_restaurant_id,
    array['owner', 'admin', 'waiter', 'host', 'cashier']::public.staff_role[]
  ) then
    raise exception using errcode = '42501', message = 'No autorizado para cobrar mesas';
  end if;

  if v_order.status = 'pagada' then
    if p_release_table and v_table_id is not null then
      update public.tables
      set status = 'libre'
      where id = v_table_id and restaurant_id = v_restaurant_id;
    end if;

    select jsonb_build_object(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'subtotal_cents', v_order.subtotal_cents,
      'tip_cents', v_order.tip_cents,
      'total_cents', v_order.total_cents,
      'payment_method', p_payment_method,
      'paid_cents', p_paid_cents,
      'change_cents', 0,
      'closed_at', v_order.closed_at,
      'table_id', v_table_id,
      'customer_name', v_order.customer_name,
      'already_paid', true
    ) into v_result;
    return v_result;
  end if;

  if v_order.status <> 'abierta' then
    raise exception using errcode = '22023', message = 'La orden no está abierta para cobro';
  end if;

  select coalesce(sum(unit_price_cents * quantity), 0)::integer into v_subtotal
  from public.order_items
  where order_id = p_order_id and restaurant_id = v_restaurant_id;

  v_final_total := v_subtotal + v_order.tax_cents + coalesce(p_tip_cents, 0);

  if p_paid_cents > 0 and p_paid_cents < v_final_total and p_payment_method = 'efectivo' then
    raise exception using errcode = '22023', message = 'El monto entregado es menor al total a cobrar';
  end if;

  if p_paid_cents > v_final_total and p_payment_method = 'efectivo' then
    v_change_cents := p_paid_cents - v_final_total;
  end if;

  insert into public.payments (
    restaurant_id,
    order_id,
    method,
    amount_cents
  )
  values (
    v_restaurant_id,
    p_order_id,
    p_payment_method,
    v_final_total
  );

  update public.orders
  set status = 'pagada',
      subtotal_cents = v_subtotal,
      tip_cents = coalesce(p_tip_cents, 0),
      total_cents = v_final_total,
      closed_at = now()
  where id = p_order_id;

  if p_release_table and v_table_id is not null then
    update public.tables
    set status = 'libre'
    where id = v_table_id and restaurant_id = v_restaurant_id;
  end if;

  select jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'subtotal_cents', v_subtotal,
    'tip_cents', coalesce(p_tip_cents, 0),
    'total_cents', v_final_total,
    'payment_method', p_payment_method,
    'paid_cents', p_paid_cents,
    'change_cents', v_change_cents,
    'closed_at', now(),
    'table_id', v_table_id,
    'customer_name', v_order.customer_name
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.checkout_table_order(uuid, public.payment_method, integer, integer, boolean) from public;
grant execute on function public.checkout_table_order(uuid, public.payment_method, integer, integer, boolean) to authenticated;
