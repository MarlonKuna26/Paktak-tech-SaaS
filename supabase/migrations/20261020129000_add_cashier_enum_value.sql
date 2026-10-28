-- 1. Agregar 'cashier' al enum de staff_role en su propia transacción para PostgreSQL
alter type public.staff_role add value if not exists 'cashier';
