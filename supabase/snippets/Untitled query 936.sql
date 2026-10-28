-- ==============================================================================
-- GUÍA DE ASIGNACIÓN DE ROLES - PAKTAK TECH SAAS
-- ==============================================================================
-- Restaurante por defecto: '00000000-0000-0000-0000-000000000001' (Restaurante Prueba A)
--
-- Instrucciones:
-- 1. Crea el usuario en Supabase Dashboard -> Authentication -> Users.
-- 2. Copia su "User UID" (UUID).
-- 3. Pega el UID en la consulta del rol correspondiente y ejecútala.
-- ==============================================================================

-- 1. ROL: ADMINISTRADOR / DUEÑO ('owner' o 'admin')
-- Permisos: Acceso total a todo el sistema (menú, precios, crear mesas, reportes financieros, ajustes).
insert into public.staff_members (user_id, restaurant_id, role, active)
values (
  'PEGA_AQUI_EL_UID_DEL_ADMIN',
  '00000000-0000-0000-0000-000000000001',
  'admin', -- o 'owner'
  true
);

-- 2. ROL: MESERO ('waiter')
-- Permisos: App del Mesero (toma de pedidos con notas, offline/online), Cobro en mesa con propinas y división, Mapa de Mesas.
-- Alerta: Recibe campana sonora y banner en tiempo real cuando la comida esté lista en cocina.
insert into public.staff_members (user_id, restaurant_id, role, active)
values (
  'PEGA_AQUI_EL_UID_DEL_MESERO',
  '00000000-0000-0000-0000-000000000001',
  'waiter',
  true
);

-- 3. ROL: COCINERO / BARRA ('kitchen')
-- Permisos: Pantalla KDS de Cocina exclusivamente (/admin/cocina).
-- Flujo: Recibe comandas con sonido de campana, pasa a "En preparación" y a "Listo".
insert into public.staff_members (user_id, restaurant_id, role, active)
values (
  'PEGA_AQUI_EL_UID_DEL_COCINERO',
  '00000000-0000-0000-0000-000000000001',
  'kitchen',
  true
);

-- 4. ROL: CAJERO ('cashier')
-- Permisos: Mesas & Salón, Pedidos & Cobros (/admin/pedidos), Cierre y Arqueo de Caja Diario (/admin/reportes).
insert into public.staff_members (user_id, restaurant_id, role, active)
values (
  'PEGA_AQUI_EL_UID_DEL_CAJERO',
  '00000000-0000-0000-0000-000000000001',
  'cashier',
  true
);

-- 5. ROL: ANFITRIÓN / HOST ('host')
-- Permisos: Mesas & Salón (asignación de mesas a comensales), Gestión del libro de Reservas web (/admin/reservas).
insert into public.staff_members (user_id, restaurant_id, role, active)
values (
  'PEGA_AQUI_EL_UID_DEL_HOST',
  '00000000-0000-0000-0000-000000000001',
  'host',
  true
);

-- ==============================================================================
-- CONSULTA ÚTIL: Ver todo tu personal activo y sus roles asignados
-- ==============================================================================
select 
  sm.id as staff_id,
  sm.user_id,
  sm.role,
  sm.active,
  r.name as restaurante
from public.staff_members sm
join public.restaurants r on r.id = sm.restaurant_id
order by sm.created_at asc;

-- ==============================================================================
-- 6. ACTUALIZACIÓN CRÍTICA: PERMISOS DE COBRO PARA CAJERO ('cashier')
-- Ejecuta este bloque si tu cajero recibe error 'No autorizado' al cobrar
-- ==============================================================================
alter table public.restaurants drop constraint if exists restaurants_currency_check;
alter table public.restaurants add constraint restaurants_currency_check check (currency in ('USD', 'EUR', 'PEN', 'COP', 'MXN'));

drop policy if exists payments_manage on public.payments;
create policy payments_manage on public.payments for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'cashier']::public.staff_role[]));

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'cashier']::public.staff_role[]));

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
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Orden no encontrada';
  end if;
  if v_order.status <> 'abierta' then
    raise exception using errcode = '22023', message = 'La orden no está abierta para cobro';
  end if;

  v_restaurant_id := v_order.restaurant_id;
  v_table_id := v_order.table_id;

  if not public.has_restaurant_role(
    v_restaurant_id,
    array['owner', 'admin', 'waiter', 'host', 'cashier']::public.staff_role[]
  ) then
    raise exception using errcode = '42501', message = 'No autorizado para cobrar mesas';
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

  insert into public.payments (restaurant_id, order_id, method, amount_cents)
  values (v_restaurant_id, p_order_id, p_payment_method, v_final_total);

  update public.orders
  set status = 'pagada', subtotal_cents = v_subtotal, tip_cents = coalesce(p_tip_cents, 0), total_cents = v_final_total, closed_at = now()
  where id = p_order_id;

  update public.tables set status = 'libre' where id = v_table_id and restaurant_id = v_restaurant_id;

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
  select * into current_order from public.public_order_requests where id = target_order_id for update;
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