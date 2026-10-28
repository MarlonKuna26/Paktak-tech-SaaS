-- Fase 8: Cierre de cuenta, división de pago y reportes diarios

-- 1. Función RPC atómica para cobrar una orden de mesa y liberarla
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

  -- 2. Verificar rol del usuario
  if not public.has_restaurant_role(
    v_restaurant_id,
    array['owner', 'admin', 'waiter', 'host']::public.staff_role[]
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

revoke all on function public.checkout_table_order(uuid, public.payment_method, integer, integer) from public;
grant execute on function public.checkout_table_order(uuid, public.payment_method, integer, integer) to authenticated;

-- 2. Función RPC para obtener reporte de ventas diarias consolidado
create or replace function public.get_daily_sales_report(
  p_restaurant_id uuid,
  p_target_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_tz timestamptz;
  v_end_tz timestamptz;
  v_total_sales integer := 0;
  v_total_orders integer := 0;
  v_avg_ticket integer := 0;
  v_methods jsonb;
  v_top_products jsonb;
  v_by_hour jsonb;
begin
  -- Verificar autorización (owner o admin)
  if not public.has_restaurant_role(
    p_restaurant_id,
    array['owner', 'admin']::public.staff_role[]
  ) then
    raise exception using errcode = '42501', message = 'No autorizado para ver reportes financieros';
  end if;

  v_start_tz := (p_target_date::text || ' 00:00:00 America/Guayaquil')::timestamptz;
  v_end_tz := (p_target_date::text || ' 23:59:59.999 America/Guayaquil')::timestamptz;

  -- Métricas generales de órdenes cerradas/pagadas
  select
    coalesce(sum(total_cents), 0)::integer,
    count(id)::integer
  into v_total_sales, v_total_orders
  from public.orders
  where restaurant_id = p_restaurant_id
    and status = 'pagada'
    and closed_at between v_start_tz and v_end_tz;

  if v_total_orders > 0 then
    v_avg_ticket := round(v_total_sales / v_total_orders)::integer;
  end if;

  -- Ventas por método de pago
  select coalesce(jsonb_agg(jsonb_build_object(
    'method', t.method,
    'count', t.qty,
    'total_cents', t.amount
  )), '[]'::jsonb)
  into v_methods
  from (
    select
      method,
      count(*)::integer as qty,
      sum(amount_cents)::integer as amount
    from public.payments
    where restaurant_id = p_restaurant_id
      and created_at between v_start_tz and v_end_tz
    group by method
    order by amount desc
  ) t;

  -- Top 5 productos más vendidos
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_name', p.product_name,
    'quantity', p.qty,
    'total_cents', p.total_amount
  )), '[]'::jsonb)
  into v_top_products
  from (
    select
      oi.product_name,
      sum(oi.quantity)::integer as qty,
      sum(oi.unit_price_cents * oi.quantity)::integer as total_amount
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.restaurant_id = p_restaurant_id
      and o.status = 'pagada'
      and o.closed_at between v_start_tz and v_end_tz
    group by oi.product_name
    order by qty desc
    limit 5
  ) p;

  -- Distribución por hora
  select coalesce(jsonb_agg(jsonb_build_object(
    'hour', h.hr,
    'orders_count', h.cnt,
    'sales_cents', h.amount
  )), '[]'::jsonb)
  into v_by_hour
  from (
    select
      extract(hour from closed_at at time zone 'America/Guayaquil')::integer as hr,
      count(*)::integer as cnt,
      sum(total_cents)::integer as amount
    from public.orders
    where restaurant_id = p_restaurant_id
      and status = 'pagada'
      and closed_at between v_start_tz and v_end_tz
    group by hr
    order by hr asc
  ) h;

  return jsonb_build_object(
    'date', p_target_date,
    'total_sales_cents', v_total_sales,
    'total_orders', v_total_orders,
    'average_ticket_cents', v_avg_ticket,
    'payments_by_method', v_methods,
    'top_products', v_top_products,
    'sales_by_hour', v_by_hour
  );
end;
$$;

revoke all on function public.get_daily_sales_report(uuid, date) from public;
grant execute on function public.get_daily_sales_report(uuid, date) to authenticated;
