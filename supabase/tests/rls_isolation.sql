begin;

-- Ejecutar con Supabase local (`supabase db test`) o en un entorno de pruebas.
-- Se crean dos usuarios temporales, cada uno miembro de un restaurante distinto.
select plan(4);

do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, aud, role)
  values
    (user_a, 'rls-a@example.test', 'authenticated', 'authenticated'),
    (user_b, 'rls-b@example.test', 'authenticated', 'authenticated');

  insert into public.staff_members (user_id, restaurant_id, role)
  values
    (user_a, '00000000-0000-0000-0000-000000000001', 'owner'),
    (user_b, '00000000-0000-0000-0000-000000000002', 'owner');

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  perform set_config('test.user_a', user_a::text, true);
  perform set_config('test.user_b', user_b::text, true);
end $$;

set role authenticated;

select results_eq(
  $$ select slug from public.restaurants order by slug $$,
  $$ values ('restaurante-prueba-a'::text) $$
);

select is_empty(
  $$ select 1 from public.restaurants where slug = 'restaurante-prueba-b' $$,
  'El usuario del restaurante A no puede leer el restaurante B'
);

select throws_ok(
  $$ insert into public.tables (restaurant_id, table_number, capacity)
     values ('00000000-0000-0000-0000-000000000002', 99, 4) $$,
  '42501',
  null,
  'El usuario del restaurante A no puede escribir en el restaurante B'
);

select is_empty(
  $$ select 1 from public.reservations
     where restaurant_id = '00000000-0000-0000-0000-000000000002' $$,
  'Las reservas del restaurante B permanecen aisladas'
);

select * from finish();
rollback;
