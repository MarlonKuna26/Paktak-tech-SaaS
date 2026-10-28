-- 1. Permisos y funciones para rol cashier y Cruzamiento de Reportes

-- 2. Asegurar que cashier tenga permisos de lectura y cobro en pedidos públicos y mesas
drop policy if exists public_order_requests_staff_update on public.public_order_requests;
create policy public_order_requests_staff_update on public.public_order_requests
  for update to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'kitchen', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'kitchen', 'cashier']::public.staff_role[]));

-- 3. Función avanzada de reporte diario cruzado: Costos, Creador y Canales
create or replace function public.get_advanced_financial_report(
  p_restaurant_id uuid,
  p_target_date date default current_date,
  p_estimated_cost_percentage numeric default 35.0
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
  v_operating_cost integer := 0;
  v_net_margin integer := 0;
  
  v_by_channel jsonb;
  v_by_creator jsonb;
  v_by_payment_method jsonb;
  v_top_products jsonb;
  v_hourly jsonb;
begin
  -- Verificar autorización
  if not public.has_restaurant_role(
    p_restaurant_id,
    array['owner', 'admin', 'cashier']::public.staff_role[]
  ) then
    raise exception using errcode = '42501', message = 'No autorizado para ver reportes financieros';
  end if;

  v_start_tz := (p_target_date::text || ' 00:00:00 America/Guayaquil')::timestamptz;
  v_end_tz := (p_target_date::text || ' 23:59:59.999 America/Guayaquil')::timestamptz;

  -- 1. Métricas Totales de Órdenes de Mesa y Públicas
  with all_sales as (
    -- Ventas de Salón (Orders)
    select 
      o.total_cents,
      o.closed_at,
      'salon' as channel,
      coalesce(sm.full_name, 'Mesero') as creator_name,
      'waiter' as creator_type
    from public.orders o
    left join public.staff_members sm on sm.id = o.waiter_id
    where o.restaurant_id = p_restaurant_id
      and o.status = 'pagada'
      and o.closed_at between v_start_tz and v_end_tz

    union all

    -- Ventas de Web / WhatsApp / Para Llevar (Public Orders)
    select 
      por.total_cents,
      por.created_at as closed_at,
      coalesce(por.service_type, 'whatsapp_web') as channel,
      coalesce(por.customer_name, 'Cliente Web') as creator_name,
      'cliente_web' as creator_type
    from public.public_order_requests por
    where por.restaurant_id = p_restaurant_id
      and por.payment_status = 'pagado'
      and por.status in ('confirmado', 'preparando', 'listo', 'completado')
      and por.created_at between v_start_tz and v_end_tz
  )
  select 
    coalesce(sum(total_cents), 0)::integer,
    count(*)::integer
  into v_total_sales, v_total_orders
  from all_sales;

  if v_total_orders > 0 then
    v_avg_ticket := round(v_total_sales / v_total_orders)::integer;
  end if;

  -- Cálculo de costo de insumos / operación estimado (default 35% de ventas)
  v_operating_cost := round(v_total_sales * (p_estimated_cost_percentage / 100.0))::integer;
  v_net_margin := v_total_sales - v_operating_cost;

  -- 2. Ventas por Canal (Web/WhatsApp vs Salón vs Para Llevar)
  with channel_data as (
    select 
      case 
        when o.table_id is not null then 'Mesa en Salón'
        else 'Salón'
      end as channel_label,
      o.total_cents
    from public.orders o
    where o.restaurant_id = p_restaurant_id
      and o.status = 'pagada'
      and o.closed_at between v_start_tz and v_end_tz

    union all

    select 
      case 
        when por.service_type = 'para_llevar' then 'Para Llevar / Takeout'
        when por.service_type = 'paleta_madera' then 'Paleta / Ficha'
        else 'WhatsApp / Menú Web'
      end as channel_label,
      por.total_cents
    from public.public_order_requests por
    where por.restaurant_id = p_restaurant_id
      and por.payment_status = 'pagado'
      and por.status in ('confirmado', 'preparando', 'listo', 'completado')
      and por.created_at between v_start_tz and v_end_tz
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'channel', cd.channel_label,
    'orders_count', count(*),
    'total_cents', coalesce(sum(cd.total_cents), 0)::integer
  )), '[]'::jsonb)
  into v_by_channel
  from channel_data cd
  group by cd.channel_label;

  -- 3. Ventas por Creador (Quién realizó o atendió el pedido)
  with creators_data as (
    select 
      coalesce(sm.full_name, 'Mesero #' || substr(o.waiter_id::text, 1, 4)) as person_name,
      'Mesero' as role_label,
      o.total_cents
    from public.orders o
    left join public.staff_members sm on sm.id = o.waiter_id
    where o.restaurant_id = p_restaurant_id
      and o.status = 'pagada'
      and o.closed_at between v_start_tz and v_end_tz

    union all

    select 
      'Cliente en Línea (' || coalesce(por.customer_name, 'Web') || ')' as person_name,
      'Cliente Web / WhatsApp' as role_label,
      por.total_cents
    from public.public_order_requests por
    where por.restaurant_id = p_restaurant_id
      and por.payment_status = 'pagado'
      and por.status in ('confirmado', 'preparando', 'listo', 'completado')
      and por.created_at between v_start_tz and v_end_tz
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'creator', person_name,
    'role', role_label,
    'orders_count', count(*),
    'total_cents', coalesce(sum(total_cents), 0)::integer
  )), '[]'::jsonb)
  into v_by_creator
  from creators_data
  group by person_name, role_label;

  -- 4. Ventas por Método de Pago
  with payment_data as (
    select 
      p.method::text as pay_method,
      p.amount_cents
    from public.payments p
    where p.restaurant_id = p_restaurant_id
      and p.created_at between v_start_tz and v_end_tz

    union all

    select 
      coalesce(por.payment_method::text, 'efectivo') as pay_method,
      por.total_cents as amount_cents
    from public.public_order_requests por
    where por.restaurant_id = p_restaurant_id
      and por.payment_status = 'pagado'
      and por.created_at between v_start_tz and v_end_tz
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'method', pd.pay_method,
    'count', count(*),
    'total_cents', coalesce(sum(pd.amount_cents), 0)::integer
  )), '[]'::jsonb)
  into v_by_payment_method
  from payment_data pd
  group by pd.pay_method;

  return jsonb_build_object(
    'date', p_target_date,
    'total_sales_cents', v_total_sales,
    'total_orders', v_total_orders,
    'avg_ticket_cents', v_avg_ticket,
    'operating_cost_cents', v_operating_cost,
    'net_margin_cents', v_net_margin,
    'cost_percentage', p_estimated_cost_percentage,
    'by_channel', v_by_channel,
    'by_creator', v_by_creator,
    'by_payment_method', v_by_payment_method
  );
end;
$$;

revoke all on function public.get_advanced_financial_report(uuid, date, numeric) from public;
grant execute on function public.get_advanced_financial_report(uuid, date, numeric) to authenticated;
