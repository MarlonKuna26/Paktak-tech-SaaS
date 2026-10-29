-- Migración: Sistema de Turnos de Caja (Doble Turno), Fondo Inicial y Cuadre de Caja (Arqueo)

create table if not exists public.cash_shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  shift_name text not null default 'Turno 1',
  cashier_name text not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  initial_cash_cents integer not null default 0 check (initial_cash_cents >= 0),
  final_cash_cents integer check (final_cash_cents >= 0),
  calculated_cash_cents integer not null default 0,
  calculated_digital_cents integer not null default 0,
  calculated_total_cents integer not null default 0,
  expected_cash_cents integer not null default 0,
  difference_cents integer not null default 0,
  left_for_next_shift_cents integer not null default 0 check (left_for_next_shift_cents >= 0),
  status text not null default 'abierto' check (status in ('abierto', 'cerrado')),
  notes text,
  created_at timestamptz not null default now()
);

-- Índices de consulta rápida
create index if not exists idx_cash_shifts_restaurant_status 
  on public.cash_shifts(restaurant_id, status);

create index if not exists idx_cash_shifts_restaurant_opened 
  on public.cash_shifts(restaurant_id, opened_at desc);

-- Seguridad RLS
alter table public.cash_shifts enable row level security;

create policy cash_shifts_staff_read on public.cash_shifts
  for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));

create policy cash_shifts_staff_insert on public.cash_shifts
  for insert to authenticated
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]));

create policy cash_shifts_staff_update on public.cash_shifts
  for update to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host', 'cashier']::public.staff_role[]));

