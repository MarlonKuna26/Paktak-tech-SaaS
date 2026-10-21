-- ==============================================================================
-- Migración: Autorización total de Cobro para Cajero y Flexibilidad de Moneda
-- ==============================================================================

-- 1. Permitir monedas latinoamericanas e internacionales en restaurants
alter table public.restaurants drop constraint if exists restaurants_currency_check;
alter table public.restaurants add constraint restaurants_currency_check check (currency in ('USD', 'EUR', 'PEN', 'COP', 'MXN'));

-- 2. Asegurar que cashier tenga permisos en las políticas RLS de payments y orders
drop policy if exists payments_manage on public.payments;
create policy payments_manage on public.payments for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'cashier']::public.staff_role[]));

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'cashier']::public.staff_role[]));

-- 3. Actualizar función RPC checkout_table_order para incluir rol 'cashier'
create or replace function public.checkout_table_order(
  p_order_id uuid,
  p_payment_method public.payment_method,
  p_tip_cents integer default 0,
  p_paid_cents integer default 0
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
  -- 1. Verificar orden y bloquearla para concurrencia
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Orden no encontrada';
  end if;

  if v_order.status <> 'abierta' then
    raise exception using errcode = '22023', message = 'La orden no está abierta para cobro';
  end if;

  v_restaurant_id := v_order.restaurant_id;
  v_table_id := v_order.table_id;

  -- 2. Verificar rol del usuario (incluyendo 'cashier')
  if not public.has_restaurant_role(
    v_restaurant_id,
    array['owner', 'admin', 'waiter', 'host', 'cashier']::public.staff_role[]
  ) then
    raise exception using errcode = '42501', message = 'No autorizado para cobrar mesas';
  end if;

  -- 3. Recalcular subtotal real de los ítems existentes
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

  -- 4. Registrar pago
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

  -- 5. Actualizar orden a pagada
  update public.orders
  set status = 'pagada',
      subtotal_cents = v_subtotal,
      tip_cents = coalesce(p_tip_cents, 0),
      total_cents = v_final_total,
      closed_at = now()
  where id = p_order_id;

  -- 6. Liberar la mesa
  update public.tables
  set status = 'libre'
  where id = v_table_id and restaurant_id = v_restaurant_id;

  -- 7. Preparar resultado con ítems para el ticket de pago
  select jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'table_id', v_table_id,
    'subtotal_cents', v_subtotal,
    'tip_cents', coalesce(p_tip_cents, 0),
    'total_cents', v_final_total,
    'paid_cents', p_paid_cents,
    'change_cents', v_change_cents,
    'payment_method', p_payment_method,
    'closed_at', now()
  ) into v_result;

  return v_result;
end;
$$;

-- 4. Actualizar register_public_order_payment para incluir rol 'cashier'
create or replace function public.register_public_order_payment(
  target_order_id uuid,
  pay_method public.payment_method,
  paid_cents integer,
  token_number text,
  target_service_type text default 'paleta_madera'
)
returns public.public_order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.public_order_requests;
  updated_order public.public_order_requests;
  calculated_change integer := 0;
begin
  select * into current_order
  from public.public_order_requests
  where id = target_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Pedido no encontrado';
  end if;

  if not public.has_restaurant_role(
    current_order.restaurant_id,
    array['owner', 'admin', 'kitchen', 'waiter', 'host', 'cashier']::public.staff_role[]
  ) then
    raise exception using errcode = '42501', message = 'No autorizado';
  end if;

  if paid_cents < current_order.total_cents then
    raise exception using errcode = '22023', message = 'El monto pagado no puede ser menor al total del pedido';
  end if;

  calculated_change := paid_cents - current_order.total_cents;

  update public.public_order_requests
  set payment_status = 'pagado',
      payment_method = pay_method,
      paid_amount_cents = paid_cents,
      change_cents = calculated_change,
      table_or_token_number = nullif(trim(token_number), ''),
      service_type = coalesce(nullif(trim(target_service_type), ''), 'paleta_madera'),
      status = case when status = 'pendiente' then 'confirmado' else status end
  where id = target_order_id
  returning * into updated_order;

  return updated_order;
end;
$$;
