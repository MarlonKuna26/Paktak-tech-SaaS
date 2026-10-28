-- Fase 7: KDS en tiempo real + endurecimiento de la sincronización del mesero.

-- 1. Datos que necesita la cocina en cada ítem.
--    station: copia de products.station para filtrar Cocina/Barra sin joins.
--    status_changed_at: para mostrar "listo hace X min".
alter table public.order_items
  add column if not exists station public.product_station not null default 'cocina',
  add column if not exists status_changed_at timestamptz not null default now();

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- 2. Publicación Realtime (RLS se aplica también a los eventos).
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['orders', 'order_items', 'tables', 'public_order_requests'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 3. Sincronización atómica de comandas del mesero.
--    - Idempotente: reenviar la misma orden/ítem (mismo UUID) no duplica nada.
--    - El precio y el nombre se copian desde products: el cliente no impone precios.
--    - Número de orden secuencial protegido con advisory lock (sin colisiones).
--    - Marca la mesa como ocupada (el rol waiter no tiene permiso directo sobre tables).
create or replace function public.waiter_sync_order(
  p_restaurant_id uuid,
  p_order_id uuid,
  p_table_id uuid,
  p_items jsonb,
  p_device_id text default null
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
begin
  select id into v_staff_id
  from public.staff_members
  where user_id = (select auth.uid())
    and restaurant_id = p_restaurant_id
    and active
    and role in ('owner', 'admin', 'waiter');

  if v_staff_id is null then
    raise exception using errcode = '42501', message = 'No autorizado para tomar comandas';
  end if;

  select restaurant_id, status, order_number
    into v_order_restaurant, v_order_status, v_order_number
  from public.orders
  where id = p_order_id;

  if v_order_restaurant is not null and v_order_restaurant <> p_restaurant_id then
    raise exception using errcode = '42501', message = 'La orden pertenece a otro restaurante';
  end if;

  if v_order_restaurant is null then
    if p_table_id is null then
      raise exception using errcode = '22023', message = 'La comanda necesita una mesa';
    end if;

    perform 1 from public.tables where id = p_table_id and restaurant_id = p_restaurant_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'Mesa no encontrada';
    end if;

    perform pg_advisory_xact_lock(hashtext('orders:' || p_restaurant_id::text));

    select coalesce(max(order_number), 0) + 1 into v_order_number
    from public.orders
    where restaurant_id = p_restaurant_id;

    insert into public.orders (id, restaurant_id, table_id, waiter_id, order_number, status, device_id)
    values (p_order_id, p_restaurant_id, p_table_id, v_staff_id, v_order_number, 'abierta', p_device_id);

    update public.tables
    set status = 'ocupada'
    where id = p_table_id and restaurant_id = p_restaurant_id;
  elsif v_order_status <> 'abierta' then
    raise exception using errcode = '22023', message = 'La orden ya está cerrada';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception using errcode = '22023', message = 'Cantidad inválida';
    end if;

    select id, name, price_cents, station
      into v_product_id, v_product_name, v_product_price, v_product_station
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and restaurant_id = p_restaurant_id;

    if v_product_id is null then
      raise exception using errcode = 'P0002', message = 'Producto no encontrado';
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

revoke all on function public.waiter_sync_order(uuid, uuid, uuid, jsonb, text) from public;
grant execute on function public.waiter_sync_order(uuid, uuid, uuid, jsonb, text) to authenticated;

-- 4. Cambio de estado desde el KDS.
--    Solo transiciones válidas (con "deshacer" un paso) y solo en órdenes abiertas.
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
  v_count integer;
begin
  update public.order_items oi
  set status = p_status,
      status_changed_at = now()
  where oi.id = any(p_item_ids)
    and public.has_restaurant_role(
      oi.restaurant_id,
      array['owner', 'admin', 'kitchen', 'waiter']::public.staff_role[]
    )
    and exists (
      select 1 from public.orders o
      where o.id = oi.order_id and o.restaurant_id = oi.restaurant_id and o.status = 'abierta'
    )
    and (
      (oi.status = 'pendiente' and p_status in ('preparando', 'listo'))
      or (oi.status = 'preparando' and p_status in ('listo', 'pendiente'))
      or (oi.status = 'listo' and p_status in ('entregado', 'preparando'))
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.kds_set_item_status(uuid[], public.order_item_status) from public;
grant execute on function public.kds_set_item_status(uuid[], public.order_item_status) to authenticated;
