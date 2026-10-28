create extension if not exists "pgcrypto";

create type public.restaurant_plan as enum ('basic', 'pro', 'chain');
create type public.restaurant_status as enum ('trial', 'active', 'suspended');
create type public.staff_role as enum ('owner', 'admin', 'host', 'waiter', 'kitchen');
create type public.table_status as enum ('libre', 'ocupada', 'reservada');
create type public.reservation_status as enum ('pendiente', 'confirmada', 'cancelada', 'no_show', 'completada');
create type public.product_station as enum ('cocina', 'barra');
create type public.order_status as enum ('abierta', 'pagada', 'cancelada');
create type public.order_item_status as enum ('pendiente', 'preparando', 'listo', 'entregado');
create type public.payment_method as enum ('efectivo', 'transferencia', 'tarjeta', 'otro');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  timezone text not null default 'America/Guayaquil',
  currency text not null default 'USD' check (currency = 'USD'),
  settings jsonb not null default '{}'::jsonb,
  plan public.restaurant_plan not null default 'basic',
  status public.restaurant_status not null default 'trial',
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role public.staff_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, restaurant_id),
  unique (restaurant_id, id)
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_number integer not null check (table_number > 0),
  capacity integer not null check (capacity > 0),
  status public.table_status not null default 'libre',
  zone text,
  unique (restaurant_id, table_number),
  unique (restaurant_id, id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  unique (restaurant_id, id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  station public.product_station not null default 'cocina',
  created_at timestamptz not null default now(),
  unique (restaurant_id, id),
  foreign key (restaurant_id, category_id) references public.categories(restaurant_id, id)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_name text not null check (char_length(trim(customer_name)) > 0),
  customer_phone text not null check (char_length(trim(customer_phone)) > 0),
  date_time timestamptz not null,
  guests integer not null check (guests > 0),
  status public.reservation_status not null default 'pendiente',
  table_id uuid,
  notes text,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  unique (restaurant_id, id),
  foreign key (restaurant_id, table_id) references public.tables(restaurant_id, id)
);

create table public.orders (
  id uuid primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null,
  waiter_id uuid not null,
  order_number integer not null,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  tip_cents integer not null default 0 check (tip_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  status public.order_status not null default 'abierta',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  device_id text,
  unique (restaurant_id, order_number),
  unique (restaurant_id, id),
  foreign key (restaurant_id, table_id) references public.tables(restaurant_id, id),
  foreign key (restaurant_id, waiter_id) references public.staff_members(restaurant_id, id)
);

create table public.order_items (
  id uuid primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null,
  product_id uuid not null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  notes text,
  status public.order_item_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  foreign key (restaurant_id, order_id) references public.orders(restaurant_id, id),
  foreign key (restaurant_id, product_id) references public.products(restaurant_id, id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null,
  method public.payment_method not null,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  foreign key (restaurant_id, order_id) references public.orders(restaurant_id, id)
);

create table public.subscriptions (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  plan public.restaurant_plan not null,
  status public.subscription_status not null default 'trialing',
  current_period_end timestamptz,
  payment_reference text
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index staff_members_user_id_idx on public.staff_members(user_id);
create index products_restaurant_id_idx on public.products(restaurant_id);
create index reservations_restaurant_date_idx on public.reservations(restaurant_id, date_time);
create index orders_restaurant_status_idx on public.orders(restaurant_id, status);
create index order_items_restaurant_status_idx on public.order_items(restaurant_id, status);

create or replace function public.get_user_restaurant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id
  from public.staff_members
  where user_id = (select auth.uid()) and active;
$$;

create or replace function public.has_restaurant_role(
  target_restaurant_id uuid,
  allowed_roles public.staff_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_members
    where user_id = (select auth.uid())
      and restaurant_id = target_restaurant_id
      and active
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.get_user_restaurant_ids() from public;
revoke all on function public.has_restaurant_role(uuid, public.staff_role[]) from public;
grant execute on function public.get_user_restaurant_ids() to authenticated;
grant execute on function public.has_restaurant_role(uuid, public.staff_role[]) to authenticated;

alter table public.restaurants enable row level security;
alter table public.staff_members enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reservations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_log enable row level security;

create policy restaurants_read on public.restaurants for select to authenticated
  using (id in (select public.get_user_restaurant_ids()));
create policy restaurants_manage on public.restaurants for all to authenticated
  using (public.has_restaurant_role(id, array['owner', 'admin']::public.staff_role[]))
  with check (public.has_restaurant_role(id, array['owner', 'admin']::public.staff_role[]));

create policy staff_read on public.staff_members for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));
create policy staff_manage on public.staff_members for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]));

create policy tables_read on public.tables for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));
create policy tables_manage on public.tables for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]));

create policy categories_read on public.categories for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));
create policy categories_manage on public.categories for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]));

create policy products_read on public.products for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));
create policy products_manage on public.products for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]));

create policy reservations_read on public.reservations for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));
create policy reservations_manage on public.reservations for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'host']::public.staff_role[]));

create policy orders_read on public.orders for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));
create policy orders_create on public.orders for insert to authenticated
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter']::public.staff_role[]));
create policy orders_update on public.orders for update to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter']::public.staff_role[]));

create policy order_items_read on public.order_items for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));
create policy order_items_create on public.order_items for insert to authenticated
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter']::public.staff_role[]));
create policy order_items_update on public.order_items for update to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'kitchen']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter', 'kitchen']::public.staff_role[]));

create policy payments_read on public.payments for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));
create policy payments_manage on public.payments for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin', 'waiter']::public.staff_role[]));

create policy subscriptions_read on public.subscriptions for select to authenticated
  using (restaurant_id in (select public.get_user_restaurant_ids()));
create policy subscriptions_manage on public.subscriptions for all to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]))
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]));

create policy audit_log_read on public.audit_log for select to authenticated
  using (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]));
create policy audit_log_create on public.audit_log for insert to authenticated
  with check (public.has_restaurant_role(restaurant_id, array['owner', 'admin']::public.staff_role[]));

insert into public.restaurants (id, name, slug, plan, status)
values
  ('00000000-0000-0000-0000-000000000001', 'Restaurante Prueba A', 'restaurante-prueba-a', 'basic', 'trial'),
  ('00000000-0000-0000-0000-000000000002', 'Restaurante Prueba B', 'restaurante-prueba-b', 'basic', 'trial');

insert into public.tables (restaurant_id, table_number, capacity)
values
  ('00000000-0000-0000-0000-000000000001', 1, 4),
  ('00000000-0000-0000-0000-000000000002', 1, 4);

insert into public.subscriptions (restaurant_id, plan, status)
values
  ('00000000-0000-0000-0000-000000000001', 'basic', 'trialing'),
  ('00000000-0000-0000-0000-000000000002', 'basic', 'trialing');
