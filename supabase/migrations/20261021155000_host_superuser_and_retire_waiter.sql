-- ==============================================================================
-- MIGRACIÓN: Host como Superusuario y Fusión/Retiro de Rol Mesero en Cajero
-- ==============================================================================

-- 1. Migrar cualquier usuario existente con rol 'waiter' a 'cashier'
update public.staff_members
set role = 'cashier'
where role = 'waiter';

-- 2. Actualizar políticas RLS de Restaurantes (Host como Superusuario)
drop policy if exists restaurants_manage on public.restaurants;
create policy restaurants_manage on public.restaurants for all to authenticated
  using (public.has_restaurant_role(id, array['owner', 'admin', 'host']::public.staff_role[]))
  with check (public.has_restaurant_role(id, array['owner', 'admin', 'host']::public.staff_role[]));

-- 3. Actualizar políticas RLS de Personal (Host gestiona todo el equipo)
drop policy if exists staff_manage on public.staff_members;
create policy staff_manage on public.staff_members for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]));

-- 4. Actualizar políticas RLS de Categorías (Host gestiona menú y catálogo)
drop policy if exists categories_manage on public.categories;
create policy categories_manage on public.categories for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]));

-- 5. Actualizar políticas RLS de Productos / Platos (Host gestiona carta completa)
drop policy if exists products_manage on public.products;
create policy products_manage on public.products for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]));

-- 6. Actualizar políticas RLS de Mesas (Host y Cajero)
drop policy if exists tables_manage on public.tables;
create policy tables_manage on public.tables for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]));

-- 7. Actualizar políticas RLS de Reservas (Host y Cajero)
drop policy if exists reservations_manage on public.reservations;
create policy reservations_manage on public.reservations for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]));

-- 8. Actualizar políticas RLS de Órdenes (Host y Cajero)
drop policy if exists orders_manage on public.orders;
drop policy if exists orders_create on public.orders;
create policy orders_create on public.orders for insert to authenticated
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]));

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]));

-- 9. Actualizar políticas RLS de Items de Orden (Host, Cocina y Cajero)
drop policy if exists order_items_manage on public.order_items;
drop policy if exists order_items_create on public.order_items;
create policy order_items_create on public.order_items for insert to authenticated
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]));

drop policy if exists order_items_update on public.order_items;
create policy order_items_update on public.order_items for update to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'kitchen', 'host', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'kitchen', 'host', 'cashier']::public.staff_role[]));

-- 10. Actualizar waiter_sync_order para autorizar al rol 'host' y 'cashier'
drop function if exists public.waiter_sync_order(uuid, uuid, uuid, jsonb, text);

create or replace function public.waiter_sync_order(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_order_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns table (
  order_id uuid,
  order_number integer,
  status public.order_status,
  items_created integer,
  items_total integer
)
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
    and role in ('owner', 'admin', 'host', 'cashier', 'waiter');

  if v_staff_id is null then
    raise exception using errcode = '42501', message = 'No autorizado para tomar o sincronizar comandas';
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

    insert into public.orders (id, restaurant_id, table_id, waiter_id, order_number, status, device_id)
    values (
      p_order_id,
      p_restaurant_id,
      p_table_id,
      v_staff_id,
      nextval('public.order_number_seq')::integer,
      'abierta',
      'pos-' || substr(v_staff_id::text, 1, 8)
    )
    returning orders.order_number, orders.status
      into v_order_number, v_order_status;

    update public.tables
    set status = 'ocupada'
    where id = p_table_id and restaurant_id = p_restaurant_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty := coalesce((v_item->>'quantity')::integer, 1);

    select name, price, station
      into v_product_name, v_product_price, v_product_station
    from public.products
    where id = v_product_id and restaurant_id = p_restaurant_id;

    if v_product_name is null then
      raise exception using errcode = '22023', message = 'Producto inválido o fuera del menú de este restaurante';
    end if;

    insert into public.order_items (
      order_id,
      restaurant_id,
      product_id,
      name,
      price,
      quantity,
      station,
      notes,
      status
    ) values (
      p_order_id,
      p_restaurant_id,
      v_product_id,
      v_product_name,
      v_product_price,
      v_qty,
      v_product_station,
      p_notes,
      'pendiente'
    );
  end loop;

  update public.orders
  set total_cents = (
    select coalesce(sum(price * quantity), 0)
    from public.order_items
    where order_id = p_order_id
  )
  where id = p_order_id;

  return query
  select
    p_order_id as order_id,
    v_order_number as order_number,
    v_order_status as status,
    jsonb_array_length(p_items)::integer as items_created,
    (select coalesce(sum(quantity), 0)::integer from public.order_items where order_id = p_order_id) as items_total;
end;
$$;

revoke all on function public.waiter_sync_order(uuid, uuid, uuid, jsonb, text) from public;
grant execute on function public.waiter_sync_order(uuid, uuid, uuid, jsonb, text) to authenticated;

-- 11. Actualizar get_kds_tickets para permitir al rol 'host'
create or replace function public.get_kds_tickets(
  p_restaurant_id uuid,
  p_station text default 'todas'
)
returns table (
  order_id uuid,
  order_number integer,
  order_status text,
  service_type text,
  table_id uuid,
  table_number integer,
  waiter_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  notes text,
  items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_restaurant_role(p_restaurant_id, array['owner', 'admin', 'kitchen', 'host', 'cashier']::public.staff_role[]) then
    raise exception using errcode = '42501', message = 'No autorizado para ver KDS';
  end if;

  return query
  select
    o.id as order_id,
    o.order_number,
    o.status::text as order_status,
    coalesce(o.metadata->>'service_type', case when o.table_id is not null then 'mesa' else 'mostrador' end) as service_type,
    o.table_id,
    t.table_number,
    o.waiter_id,
    o.created_at,
    o.updated_at,
    o.metadata->>'notes' as notes,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'name', oi.name,
          'quantity', oi.quantity,
          'station', oi.station::text,
          'status', oi.status::text,
          'notes', oi.notes,
          'kds_time_pending_at', oi.kds_time_pending_at,
          'kds_time_cooking_at', oi.kds_time_cooking_at,
          'kds_time_ready_at', oi.kds_time_ready_at,
          'kds_time_served_at', oi.kds_time_served_at
        ) order by oi.created_at asc
      ) filter (where oi.id is not null),
      '[]'::jsonb
    ) as items
  from public.orders o
  left join public.tables t on t.id = o.table_id
  join public.order_items oi on oi.order_id = o.id
  where o.restaurant_id = p_restaurant_id
    and o.status in ('abierta', 'pagada', 'en_espera')
    and (p_station = 'todas' or oi.station::text = p_station)
  group by o.id, o.order_number, o.status, o.table_id, t.table_number, o.waiter_id, o.created_at, o.updated_at, o.metadata
  having count(oi.id) filter (where oi.status <> 'servido') > 0
  order by o.created_at asc;
end;
$$;
