-- ==============================================================================
-- MIGRACIÓN: Anulación de ítems no servidos y Creación de Pedidos Para Llevar
-- ==============================================================================

-- 1. Políticas RLS de eliminación en order_items y public_order_items
drop policy if exists order_items_delete on public.order_items;
create policy order_items_delete on public.order_items for delete to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier', 'waiter']::public.staff_role[]));

drop policy if exists public_order_items_delete on public.public_order_items;
create policy public_order_items_delete on public.public_order_items for delete to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier', 'waiter']::public.staff_role[]));

-- 2. Función RPC para anular o reducir un plato que no se va a servir
create or replace function public.void_order_item(
  p_order_id uuid,
  p_item_id uuid,
  p_reduce_one boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_id uuid;
  v_restaurant_id uuid;
  v_order_status public.order_status;
  v_item_qty integer;
  v_item_unit_price integer;
  v_new_subtotal integer := 0;
  v_remaining_items integer := 0;
  v_is_table_order boolean := false;
  v_pub_status public.public_order_status;
begin
  -- Caso 1: Buscar en order_items (comanda de mesa de salón)
  select oi.restaurant_id, oi.quantity, oi.unit_price_cents, o.status
    into v_restaurant_id, v_item_qty, v_item_unit_price, v_order_status
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = p_item_id and oi.order_id = p_order_id;

  if found then
    v_is_table_order := true;

    if not public.has_restaurant_role(
      v_restaurant_id,
      array['owner', 'admin', 'host', 'cashier', 'waiter']::public.staff_role[]
    ) then
      raise exception using errcode = '42501', message = 'No autorizado para anular platos de esta comanda';
    end if;

    if v_order_status not in ('abierta', 'en_espera') then
      raise exception using errcode = '22023', message = 'No se pueden modificar platos de una comanda ya cerrada';
    end if;

    if p_reduce_one and v_item_qty > 1 then
      update public.order_items
      set quantity = quantity - 1
      where id = p_item_id;
    else
      delete from public.order_items
      where id = p_item_id;
    end if;

    -- Recalcular subtotal en orders
    select coalesce(sum(unit_price_cents * quantity), 0)::integer, count(*)::integer
      into v_new_subtotal, v_remaining_items
    from public.order_items
    where order_id = p_order_id;

    update public.orders
    set subtotal_cents = v_new_subtotal,
        total_cents = v_new_subtotal + tax_cents + tip_cents
    where id = p_order_id;

    return jsonb_build_object(
      'success', true,
      'is_table_order', true,
      'order_id', p_order_id,
      'item_id', p_item_id,
      'new_subtotal_cents', v_new_subtotal,
      'remaining_items_count', v_remaining_items
    );
  end if;

  -- Caso 2: Buscar en public_order_items (pedidos para llevar / mostrador)
  select poi.restaurant_id, poi.quantity, poi.unit_price_cents, po.status
    into v_restaurant_id, v_item_qty, v_item_unit_price, v_pub_status
  from public.public_order_items poi
  join public.public_order_requests po on po.id = poi.order_request_id
  where poi.id = p_item_id and poi.order_request_id = p_order_id;

  if found then
    if not public.has_restaurant_role(
      v_restaurant_id,
      array['owner', 'admin', 'host', 'cashier', 'waiter']::public.staff_role[]
    ) then
      raise exception using errcode = '42501', message = 'No autorizado para anular platos de este pedido';
    end if;

    if v_pub_status in ('completado', 'cancelado', 'rechazado') then
      raise exception using errcode = '22023', message = 'No se puede anular un plato de un pedido finalizado';
    end if;

    if p_reduce_one and v_item_qty > 1 then
      update public.public_order_items
      set quantity = quantity - 1
      where id = p_item_id;
    else
      delete from public.public_order_items
      where id = p_item_id;
    end if;

    -- Recalcular total en public_order_requests
    select coalesce(sum(unit_price_cents * quantity), 0)::integer, count(*)::integer
      into v_new_subtotal, v_remaining_items
    from public.public_order_items
    where order_request_id = p_order_id;

    update public.public_order_requests
    set total_cents = v_new_subtotal
    where id = p_order_id;

    return jsonb_build_object(
      'success', true,
      'is_table_order', false,
      'order_id', p_order_id,
      'item_id', p_item_id,
      'new_subtotal_cents', v_new_subtotal,
      'remaining_items_count', v_remaining_items
    );
  end if;

  raise exception using errcode = 'P0002', message = 'Plato u orden no encontrada';
end;
$$;

revoke all on function public.void_order_item(uuid, uuid, boolean) from public;
grant execute on function public.void_order_item(uuid, uuid, boolean) to authenticated;

-- 3. Función RPC para creación ágil de pedidos Para Llevar desde el mostrador del cajero
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
  -- Verificar autorización de personal
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

  -- Calcular total con precios oficiales de la base de datos
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

  -- Validar cobro si se paga de inmediato
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

  -- Insertar ítems
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
      notes
    ) values (
      v_order_id,
      p_restaurant_id,
      v_prod.id,
      v_prod.name,
      v_prod.price_cents,
      v_qty,
      nullif(trim(v_item ->> 'notes'), '')
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

revoke all on function public.create_staff_takeaway_order(uuid, text, text, text, jsonb, boolean, public.payment_method, integer) from public;
grant execute on function public.create_staff_takeaway_order(uuid, text, text, text, jsonb, boolean, public.payment_method, integer) to authenticated;

