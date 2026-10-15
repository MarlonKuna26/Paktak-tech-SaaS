-- Migración para soporte de Paleta/Ficha numerada, Modos de Servicio y Cobro Anticipado
alter table public.public_order_requests
  add column if not exists service_type text not null default 'paleta_madera' check (service_type in ('paleta_madera', 'mesa_fija', 'para_llevar')),
  add column if not exists table_or_token_number text,
  add column if not exists payment_status text not null default 'pendiente' check (payment_status in ('pendiente', 'pagado')),
  add column if not exists payment_method public.payment_method,
  add column if not exists paid_amount_cents integer check (paid_amount_cents >= 0),
  add column if not exists change_cents integer check (change_cents >= 0);

-- Actualizar get_public_order para devolver estos campos nuevos al cliente
drop function if exists public.get_public_order(text, text);

create function public.get_public_order(
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
    'status', o.status,
    'service_type', o.service_type,
    'table_or_token_number', o.table_or_token_number,
    'payment_status', o.payment_status,
    'payment_method', o.payment_method,
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
      from public.public_order_items i where i.order_request_id = o.id
    ), '[]'::jsonb)
  ) into order_data
  from public.public_order_requests o
  where (upper(o.tracking_code) = upper(trim(order_code)) or o.tracking_token = trim(order_code))
    and regexp_replace(o.customer_phone, '\D', '', 'g') =
        regexp_replace(trim(phone_value), '\D', '', 'g');
  if order_data is null then
    raise exception using errcode = 'P0002', message = 'Pedido no encontrado';
  end if;
  return order_data;
end;
$$;

-- Función RPC para registrar cobro y asignar paleta/mesa
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

  if not public.has_restaurant_role(current_order.restaurant_id, array['owner', 'admin', 'kitchen', 'waiter', 'host']::public.staff_role[]) then
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

revoke all on function public.register_public_order_payment(uuid, public.payment_method, integer, text, text) from public;
grant execute on function public.register_public_order_payment(uuid, public.payment_method, integer, text, text) to authenticated;
