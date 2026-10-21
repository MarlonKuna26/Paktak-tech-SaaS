-- Asignar usuario como owner de un restaurante existente
insert into public.staff_members (user_id, restaurant_id, role, active)
values (
  '85780d43-bcc8-4cf8-a8a6-68b2facc4986', -- josfia14@gmail.com
  '00000000-0000-0000-0000-000000000001', -- Restaurante Prueba A
  'owner',
  true
);