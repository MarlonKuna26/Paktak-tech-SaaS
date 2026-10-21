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