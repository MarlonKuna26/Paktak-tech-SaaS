-- Migration: Permitir despacho y servicio directo de platos a la mesa,
-- y blindar la liberación de mesas impidiendo que se liberen si la comida aún no ha sido servida.

-- 1. Actualizar kds_set_item_status para permitir transición directa a 'entregado'
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
      array['owner', 'admin', 'kitchen', 'waiter', 'cashier', 'host']::public.staff_role[]
    )
    and exists (
      select 1 from public.orders o
      where o.id = oi.order_id 
        and o.restaurant_id = oi.restaurant_id 
        and o.status in ('abierta', 'pagada', 'en_espera')
    )
    and (
      (oi.status = 'pendiente' and p_status in ('preparando', 'listo', 'entregado'))
      or (oi.status = 'preparando' and p_status in ('listo', 'pendiente', 'entregado'))
      or (oi.status = 'listo' and p_status in ('entregado', 'preparando', 'pendiente'))
      or (oi.status = 'entregado' and p_status in ('listo', 'preparando', 'pendiente'))
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.kds_set_item_status(uuid[], public.order_item_status) from public;
grant execute on function public.kds_set_item_status(uuid[], public.order_item_status) to authenticated;

-- 2. Función RPC para marcar todos los platos de una comanda como servidos en mesa
create or replace function public.serve_order_items(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_restaurant_id uuid;
begin
  select restaurant_id into v_restaurant_id
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Orden no encontrada';
  end if;

  if not public.has_restaurant_role(
    v_restaurant_id,
    array['owner', 'admin', 'kitchen', 'waiter', 'cashier', 'host']::public.staff_role[]
  ) then
    raise exception using errcode = '42501', message = 'No autorizado para marcar comida como servida';
  end if;

  update public.order_items
  set status = 'entregado',
      status_changed_at = now()
  where order_id = p_order_id
    and restaurant_id = v_restaurant_id
    and status <> 'entregado';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.serve_order_items(uuid) from public;
grant execute on function public.serve_order_items(uuid) to authenticated;

-- 3. Actualizar checkout_table_order para evitar liberar mesa si la comida no está servida
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
  v_unserved_count integer;
  v_can_release boolean := false;
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

  -- Contar si hay platos pendientes de entrega/servicio en mesa
  select count(*) into v_unserved_count
  from public.order_items
  where order_id = p_order_id
    and restaurant_id = v_restaurant_id
    and status <> 'entregado';

  -- Solo se puede liberar la mesa si no quedan platos por servir en mesa
  v_can_release := (p_release_table and v_unserved_count = 0);

  -- Si la orden ya fue pagada (ej. pre-pago antes de servir)
  if v_order.status = 'pagada' then
    if v_can_release and v_table_id is not null then
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
      'already_paid', true,
      'table_released', (v_can_release and v_table_id is not null),
      'unserved_items_count', v_unserved_count
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

  if v_can_release and v_table_id is not null then
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
    'table_released', (v_can_release and v_table_id is not null),
    'unserved_items_count', v_unserved_count
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.checkout_table_order(uuid, public.payment_method, integer, integer, boolean) from public;
grant execute on function public.checkout_table_order(uuid, public.payment_method, integer, integer, boolean) to authenticated;
