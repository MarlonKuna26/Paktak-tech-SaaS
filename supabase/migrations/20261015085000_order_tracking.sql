alter table public.public_order_requests
  add column if not exists tracking_code text,
  add column if not exists tracking_token text,
  add column if not exists rejection_reason text;

update public.public_order_requests
set tracking_code = upper('PK-' || substr(replace(id::text, '-', ''), 1, 6)),
    tracking_token = encode(gen_random_bytes(24), 'hex')
where tracking_code is null or tracking_token is null;

alter table public.public_order_requests
  alter column tracking_code set not null,
  alter column tracking_token set not null;

create unique index if not exists public_order_requests_tracking_code_idx
  on public.public_order_requests (tracking_code);
create unique index if not exists public_order_requests_tracking_token_idx
  on public.public_order_requests (tracking_token);

create or replace function public.create_public_order_v2(
  restaurant_slug text,
  customer_name text,
  customer_phone text,
  order_notes text,
  requested_items jsonb,
  captcha_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  created_order_id uuid;
  tracking_code_value text;
  tracking_token_value text;
  item jsonb;
  product_row public.products%rowtype;
  calculated_total integer := 0;
  item_quantity integer;
begin
  if jsonb_typeof(requested_items) <> 'array' or jsonb_array_length(requested_items) = 0 then
    raise exception using errcode = '22023', message = 'El pedido debe tener productos';
  end if;
  if jsonb_array_length(requested_items) > 50 then
    raise exception using errcode = '22023', message = 'El pedido tiene demasiados productos';
  end if;
  select id into target_restaurant_id
  from public.restaurants
  where slug = lower(trim(restaurant_slug))
    and status in ('trial', 'active');
  if target_restaurant_id is null then
    raise exception using errcode = '22023', message = 'Restaurante no disponible';
  end if;
  if length(trim(customer_name)) not between 2 and 120
     or length(trim(customer_phone)) not between 7 and 30 then
    raise exception using errcode = '22023', message = 'Datos del cliente inválidos';
  end if;

  for item in select value from jsonb_array_elements(requested_items)
  loop
    item_quantity := (item->>'quantity')::integer;
    if item_quantity < 1 or item_quantity > 99 then
      raise exception using errcode = '22023', message = 'Cantidad inválida';
    end if;
    select * into product_row
    from public.products
    where id = (item->>'product_id')::uuid
      and restaurant_id = target_restaurant_id
      and active;
    if not found then
      raise exception using errcode = '22023', message = 'Producto no disponible';
    end if;
    calculated_total := calculated_total + product_row.price_cents * item_quantity;
  end loop;

  created_order_id := gen_random_uuid();
  tracking_code_value := upper('PK-' || substr(replace(created_order_id::text, '-', ''), 1, 6));
  tracking_token_value := encode(gen_random_bytes(24), 'hex');

  insert into public.public_order_requests (
    id, restaurant_id, customer_name, customer_phone, notes, total_cents,
    tracking_code, tracking_token
  )
  values (
    created_order_id, target_restaurant_id, trim(customer_name), trim(customer_phone),
    nullif(trim(order_notes), ''), calculated_total, tracking_code_value, tracking_token_value
  );

  for item in select value from jsonb_array_elements(requested_items)
  loop
    select * into product_row
    from public.products
    where id = (item->>'product_id')::uuid
      and restaurant_id = target_restaurant_id
      and active;
    insert into public.public_order_items (
      order_request_id, restaurant_id, product_id, product_name,
      unit_price_cents, quantity, notes
    )
    values (
      created_order_id, target_restaurant_id, product_row.id, product_row.name,
      product_row.price_cents, (item->>'quantity')::integer,
      nullif(trim(item->>'notes'), '')
    );
  end loop;

  return jsonb_build_object(
    'id', created_order_id,
    'tracking_code', tracking_code_value,
    'tracking_token', tracking_token_value
  );
end;
$$;

revoke all on function public.create_public_order_v2(text, text, text, text, jsonb, text) from public;
grant execute on function public.create_public_order_v2(text, text, text, text, jsonb, text) to anon, authenticated;

create or replace function public.get_public_order(
  order_code text,
  customer_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_data jsonb;
begin
  select jsonb_build_object(
    'id', o.id,
    'tracking_code', o.tracking_code,
    'status', o.status,
    'rejection_reason', o.rejection_reason,
    'customer_name', o.customer_name,
    'total_cents', o.total_cents,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'quantity', i.quantity,
        'unit_price_cents', i.unit_price_cents,
        'notes', i.notes
      ) order by i.product_name)
      from public.public_order_items i
      where i.order_request_id = o.id
    ), '[]'::jsonb)
  )
  into order_data
  from public.public_order_requests o
  where (
    upper(o.tracking_code) = upper(trim(order_code))
    or o.tracking_token = trim(order_code)
  )
  and regexp_replace(o.customer_phone, '\D', '', 'g') =
      regexp_replace(trim(customer_phone), '\D', '', 'g');

  if order_data is null then
    raise exception using errcode = 'P0002', message = 'Pedido no encontrado';
  end if;
  return order_data;
end;
$$;

revoke all on function public.get_public_order(text, text) from public;
grant execute on function public.get_public_order(text, text) to anon, authenticated;

create or replace function public.transition_public_order(
  order_id uuid,
  next_status public.public_order_status,
  reason text default null
)
returns public.public_order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.public_order_requests;
  updated_order public.public_order_requests;
begin
  select * into current_order
  from public.public_order_requests
  where id = order_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Pedido no encontrado';
  end if;
  if not public.has_restaurant_role(current_order.restaurant_id, array['owner', 'admin', 'kitchen']::public.staff_role[]) then
    raise exception using errcode = '42501', message = 'No autorizado';
  end if;
  if current_order.status <> 'pendiente' and next_status in ('confirmado', 'rechazado') then
    raise exception using errcode = '22023', message = 'El pedido ya fue procesado';
  end if;
  if current_order.status = 'pendiente' and next_status = 'preparando' then
    raise exception using errcode = '22023', message = 'Primero confirma el pedido';
  end if;
  if next_status = 'rechazado' and length(trim(coalesce(reason, ''))) < 3 then
    raise exception using errcode = '22023', message = 'El motivo del rechazo es obligatorio';
  end if;
  if current_order.status in ('rechazado', 'cancelado', 'completado') then
    raise exception using errcode = '22023', message = 'El pedido ya está cerrado';
  end if;
  update public.public_order_requests
  set status = next_status,
      rejection_reason = case when next_status = 'rechazado' then trim(reason) else rejection_reason end
  where id = order_id
  returning * into updated_order;
  return updated_order;
end;
$$;

revoke all on function public.transition_public_order(uuid, public.public_order_status, text) from public;
grant execute on function public.transition_public_order(uuid, public.public_order_status, text) to authenticated;
