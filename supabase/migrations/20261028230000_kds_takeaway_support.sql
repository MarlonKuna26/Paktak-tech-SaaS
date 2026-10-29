-- ==============================================================================
-- MIGRACIÓN: Soporte Completo de Pedidos Para Llevar en KDS Cocina & Barra
-- ==============================================================================

-- 1. Agregar columnas de estado, estación y timestamp a public_order_items
alter table public.public_order_items
  add column if not exists status text not null default 'pendiente',
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists station text not null default 'cocina';

-- Actualizar estaciones de los ítems existentes según el producto
update public.public_order_items poi
set station = coalesce(p.station::text, 'cocina')
from public.products p
where poi.product_id = p.id;

-- 2. Actualizar create_staff_takeaway_order para incluir station y status en public_order_items
create or replace function public.create_staff_takeaway_order(
  p_restaurant_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_notes text,
  p_items jsonb,
  p_pay_now boolean default false,
  p_payment_method public.payment_method default null,
  p_paid_cents integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid;
  v_order_id uuid;
  v_tracking_code text;
  v_tracking_token text;
  v_item jsonb;
  v_prod public.products%rowtype;
  v_qty integer;
  v_calculated_total integer := 0;
  v_change_cents integer := 0;
  v_pay_status text := 'pendiente';
begin
  select sm.id into v_staff_id
  from public.staff_members sm
  where sm.user_id = (select auth.uid())
    and sm.restaurant_id = p_restaurant_id
    and sm.active
    and sm.role in ('owner', 'admin', 'host', 'cashier', 'waiter');

  if v_staff_id is null then
    raise exception using errcode = '42501', message = 'No autorizado para crear pedidos de mostrador';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'El pedido debe incluir al menos un producto';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception using errcode = '22023', message = 'Cantidad de producto inválida';
    end if;

    select * into v_prod
    from public.products
    where id = (v_item ->> 'productId')::uuid
      and restaurant_id = p_restaurant_id
      and active;

    if not found then
      raise exception using errcode = '22023', message = 'Producto no disponible en la carta';
    end if;

    v_calculated_total := v_calculated_total + (v_prod.price_cents * v_qty);
  end loop;

  if p_pay_now then
    if p_payment_method is null then
      raise exception using errcode = '22023', message = 'Indica el método de pago para cobrar';
    end if;
    if p_paid_cents is not null and p_paid_cents < v_calculated_total and p_payment_method = 'efectivo' then
      raise exception using errcode = '22023', message = 'El efectivo recibido es menor al total del pedido';
    end if;

    v_pay_status := 'pagado';
    if p_paid_cents is not null and p_paid_cents >= v_calculated_total and p_payment_method = 'efectivo' then
      v_change_cents := p_paid_cents - v_calculated_total;
    end if;
  end if;

  v_order_id := gen_random_uuid();
  v_tracking_code := upper('LLEVAR-' || substr(replace(v_order_id::text, '-', ''), 1, 5));
  v_tracking_token := md5(gen_random_uuid()::text || clock_timestamp()::text);

  insert into public.public_order_requests (
    id,
    restaurant_id,
    customer_name,
    customer_phone,
    notes,
    total_cents,
    tracking_code,
    tracking_token,
    status,
    service_type,
    table_or_token_number,
    payment_status,
    payment_method,
    paid_amount_cents,
    change_cents
  ) values (
    v_order_id,
    p_restaurant_id,
    coalesce(nullif(trim(p_customer_name), ''), 'Cliente Para Llevar'),
    coalesce(nullif(trim(p_customer_phone), ''), 'Mostrador'),
    nullif(trim(p_notes), ''),
    v_calculated_total,
    v_tracking_code,
    v_tracking_token,
    'confirmado',
    'para_llevar',
    'Llevar',
    v_pay_status,
    p_payment_method,
    case when p_pay_now then coalesce(p_paid_cents, v_calculated_total) else null end,
    v_change_cents
  );

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    select * into v_prod
    from public.products
    where id = (v_item ->> 'productId')::uuid
      and restaurant_id = p_restaurant_id;

    insert into public.public_order_items (
      order_request_id,
      restaurant_id,
      product_id,
      product_name,
      unit_price_cents,
      quantity,
      notes,
      status,
      station,
      status_changed_at
    ) values (
      v_order_id,
      p_restaurant_id,
      v_prod.id,
      v_prod.name,
      v_prod.price_cents,
      v_qty,
      nullif(trim(v_item ->> 'notes'), ''),
      'pendiente',
      coalesce(v_prod.station::text, 'cocina'),
      now()
    );
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'tracking_code', v_tracking_code,
    'customer_name', coalesce(nullif(trim(p_customer_name), ''), 'Cliente Para Llevar'),
    'total_cents', v_calculated_total,
    'status', 'confirmado',
    'service_type', 'para_llevar',
    'payment_status', v_pay_status,
    'change_cents', v_change_cents
  );
end;
$$;

-- 3. Actualizar kds_set_item_status para admitir tanto order_items como public_order_items
create or replace function public.kds_set_item_status(
  p_item_ids uuid[],
  p_status public.order_item_status
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_pub_count integer := 0;
  v_pub_req_id uuid;
  v_unready_count integer;
  v_uncompleted_count integer;
begin
  -- Caso A: Ítems de salón (order_items)
  update public.order_items oi
  set status = p_status,
      status_changed_at = now()
  where oi.id = any(p_item_ids)
    and public.has_restaurant_role(
      oi.restaurant_id,
      array['owner', 'admin', 'kitchen', 'waiter', 'cashier', 'host']::public.staff_role[]
    );

  get diagnostics v_count = row_count;

  -- Caso B: Ítems para llevar / mostrador (public_order_items)
  update public.public_order_items poi
  set status = p_status::text,
      status_changed_at = now()
  where poi.id = any(p_item_ids)
    and public.has_restaurant_role(
      poi.restaurant_id,
      array['owner', 'admin', 'kitchen', 'waiter', 'cashier', 'host']::public.staff_role[]
    );

  get diagnostics v_pub_count = row_count;

  -- Sincronizar el pedido padre si se movieron platos para llevar
  if v_pub_count > 0 then
    for v_pub_req_id in
      select distinct order_request_id
      from public.public_order_items
      where id = any(p_item_ids)
    loop
      select count(*) into v_unready_count
      from public.public_order_items
      where order_request_id = v_pub_req_id
        and status not in ('listo', 'entregado');

      select count(*) into v_uncompleted_count
      from public.public_order_items
      where order_request_id = v_pub_req_id
        and status <> 'entregado';

      if v_uncompleted_count = 0 then
        update public.public_order_requests
        set status = 'completado'
        where id = v_pub_req_id and status not in ('completado', 'cancelado', 'rechazado');
      elsif v_unready_count = 0 then
        update public.public_order_requests
        set status = 'listo'
        where id = v_pub_req_id and status not in ('listo', 'completado', 'cancelado', 'rechazado');
      elsif p_status = 'preparando' then
        update public.public_order_requests
        set status = 'preparando'
        where id = v_pub_req_id and status in ('pendiente', 'confirmado');
      elsif p_status = 'listo' then
        update public.public_order_requests
        set status = 'listo'
        where id = v_pub_req_id and status not in ('listo', 'completado', 'cancelado', 'rechazado');
      end if;
    end loop;
  end if;

  return v_count + v_pub_count;
end;
$$;

revoke all on function public.kds_set_item_status(uuid[], public.order_item_status) from public;
grant execute on function public.kds_set_item_status(uuid[], public.order_item_status) to authenticated;
