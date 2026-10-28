create type public.public_order_status as enum (
  'pendiente',
  'confirmado',
  'rechazado',
  'preparando',
  'listo',
  'completado',
  'cancelado'
);

create table public.public_order_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  customer_phone text not null check (char_length(trim(customer_phone)) between 7 and 30),
  notes text,
  total_cents integer not null check (total_cents >= 0),
  status public.public_order_status not null default 'pendiente',
  created_at timestamptz not null default now()
);

create table public.public_order_items (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.public_order_requests(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  notes text,
  unique (order_request_id, product_id)
);

alter table public.public_order_requests enable row level security;
alter table public.public_order_items enable row level security;

create policy public_order_requests_staff_read on public.public_order_requests
  for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));

create policy public_order_requests_staff_update on public.public_order_requests
  for update to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'kitchen']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'kitchen']::public.staff_role[]));

create policy public_order_items_staff_read on public.public_order_items
  for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));

create or replace function public.create_public_order(
  restaurant_slug text,
  customer_name text,
  customer_phone text,
  order_notes text,
  requested_items jsonb,
  captcha_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_restaurant_id uuid;
  created_order_id uuid;
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

  insert into public.public_order_requests (
    restaurant_id, customer_name, customer_phone, notes, total_cents
  )
  values (
    target_restaurant_id, trim(customer_name), trim(customer_phone),
    nullif(trim(order_notes), ''), calculated_total
  )
  returning id into created_order_id;

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

  return created_order_id;
end;
$$;

revoke all on function public.create_public_order(text, text, text, text, jsonb, text) from public;
grant execute on function public.create_public_order(text, text, text, text, jsonb, text) to anon, authenticated;

create policy products_public_lookup on public.products
  for select to anon
  using (
    active and exists (
      select 1 from public.restaurants
      where restaurants.id = products.restaurant_id
        and restaurants.status in ('trial', 'active')
    )
  );

create policy categories_public_lookup on public.categories
  for select to anon
  using (
    active and exists (
      select 1 from public.restaurants
      where restaurants.id = categories.restaurant_id
        and restaurants.status in ('trial', 'active')
    )
  );
