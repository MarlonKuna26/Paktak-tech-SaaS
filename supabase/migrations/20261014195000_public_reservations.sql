create or replace function public.create_public_reservation(
  restaurant_slug text,
  customer_name text,
  customer_phone text,
  reservation_date_time timestamptz,
  guest_count integer,
  reservation_notes text default null,
  captcha_token text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_restaurant public.restaurants%rowtype;
  created_reservation public.reservations;
  available_capacity integer;
begin
  if length(trim(customer_name)) < 2 or length(trim(customer_name)) > 120 then
    raise exception using errcode = '22023', message = 'Nombre inválido';
  end if;

  if length(trim(customer_phone)) < 7 or length(trim(customer_phone)) > 30 then
    raise exception using errcode = '22023', message = 'Teléfono inválido';
  end if;

  if guest_count < 1 or guest_count > 30 then
    raise exception using errcode = '22023', message = 'Número de personas inválido';
  end if;

  if reservation_date_time <= now() then
    raise exception using errcode = '22023', message = 'La reserva debe ser futura';
  end if;

  select *
  into target_restaurant
  from public.restaurants
  where slug = lower(trim(restaurant_slug))
    and status in ('trial', 'active');

  if not found then
    raise exception using errcode = '22023', message = 'Restaurante no disponible';
  end if;

  select coalesce(sum(capacity), 0)
  into available_capacity
  from public.tables
  where restaurant_id = target_restaurant.id;

  if available_capacity < guest_count then
    raise exception using errcode = '22023', message = 'Capacidad insuficiente';
  end if;

  if exists (
    select 1
    from public.reservations
    where restaurant_id = target_restaurant.id
      and reservations.customer_phone = trim(create_public_reservation.customer_phone)
      and date_time between reservation_date_time - interval '15 minutes'
                        and reservation_date_time + interval '15 minutes'
      and status not in ('cancelada', 'no_show')
  ) then
    raise exception using errcode = '23505', message = 'Ya existe una reserva reciente';
  end if;

  insert into public.reservations (
    restaurant_id, customer_name, customer_phone, date_time, guests, notes, source
  )
  values (
    target_restaurant.id, trim(customer_name), trim(customer_phone),
    reservation_date_time, guest_count, nullif(trim(reservation_notes), ''), 'web'
  )
  returning * into created_reservation;

  return created_reservation;
end;
$$;

revoke all on function public.create_public_reservation(text, text, text, timestamptz, integer, text, text) from public;
grant execute on function public.create_public_reservation(text, text, text, timestamptz, integer, text, text) to anon, authenticated;

create policy restaurants_public_lookup on public.restaurants
  for select to anon
  using (status in ('trial', 'active'));
