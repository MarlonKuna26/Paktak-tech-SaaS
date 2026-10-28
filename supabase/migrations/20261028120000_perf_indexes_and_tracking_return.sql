-- Índices para acelerar drásticamente consultas en Vercel & Supabase

-- 1. Órdenes públicas (rastreo, dashboards, cocina)
create index if not exists idx_public_order_requests_restaurant_id 
  on public.public_order_requests(restaurant_id);

create index if not exists idx_public_order_requests_created_at 
  on public.public_order_requests(restaurant_id, created_at desc);

create index if not exists idx_public_order_requests_tracking_code 
  on public.public_order_requests(upper(tracking_code));

create index if not exists idx_public_order_requests_tracking_token 
  on public.public_order_requests(tracking_token);

create index if not exists idx_public_order_requests_customer_phone 
  on public.public_order_requests(customer_phone);

create index if not exists idx_public_order_requests_status 
  on public.public_order_requests(restaurant_id, status, payment_status);

-- 2. Items de órdenes públicas
create index if not exists idx_public_order_items_order_request_id 
  on public.public_order_items(order_request_id);

create index if not exists idx_public_order_items_restaurant_id 
  on public.public_order_items(restaurant_id);

-- 3. Pagos (Dashboard ejecutivo, arqueo, caja)
create index if not exists idx_payments_restaurant_created 
  on public.payments(restaurant_id, created_at desc);

create index if not exists idx_payments_order_id 
  on public.payments(order_id);

-- 4. Órdenes de Salón
create index if not exists idx_orders_restaurant_opened 
  on public.orders(restaurant_id, opened_at desc);

create index if not exists idx_orders_table_status 
  on public.orders(restaurant_id, table_id, status);

-- 5. Mesas y Reservas
create index if not exists idx_tables_restaurant_status 
  on public.tables(restaurant_id, status);

create index if not exists idx_reservations_table_status 
  on public.reservations(restaurant_id, table_id, status);

-- 6. Menú y Productos
create index if not exists idx_categories_restaurant_sort 
  on public.categories(restaurant_id, sort_order asc);

create index if not exists idx_products_restaurant_active 
  on public.products(restaurant_id, active, name asc);

-- 7. Actualizar get_public_order para incluir slug y nombre del restaurante
drop function if exists public.get_public_order(text, text);

create or replace function public.get_public_order(
  order_code text,
  phone_value text
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
    'tracking_token', o.tracking_token,
    'status', o.status,
    'service_type', o.service_type,
    'table_or_token_number', o.table_or_token_number,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
    'rejection_reason', o.rejection_reason,
    'customer_name', o.customer_name,
    'total_cents', o.total_cents,
    'created_at', o.created_at,
    'restaurant_id', o.restaurant_id,
    'restaurant_slug', r.slug,
    'restaurant_name', r.name,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'quantity', i.quantity,
        'unit_price_cents', i.unit_price_cents,
        'notes', i.notes
      ) order by i.product_name)
      from public.public_order_items i where i.order_request_id = o.id
    ), '[]'::jsonb)
  ) into order_data
  from public.public_order_requests o
  join public.restaurants r on r.id = o.restaurant_id
  where (upper(o.tracking_code) = upper(trim(order_code)) or o.tracking_token = trim(order_code))
    and regexp_replace(o.customer_phone, '\D', '', 'g') =
        regexp_replace(trim(phone_value), '\D', '', 'g');

  if order_data is null then
    raise exception using errcode = 'P0002', message = 'Pedido no encontrado';
  end if;
  return order_data;
end;
$$;

revoke all on function public.get_public_order(text, text) from public;
grant execute on function public.get_public_order(text, text) to anon, authenticated;

