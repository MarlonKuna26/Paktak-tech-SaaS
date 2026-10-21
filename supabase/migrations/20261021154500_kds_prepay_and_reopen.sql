-- ==============================================================================
-- Migración: Soporte en KDS para órdenes pre-pagadas, rol cajero y reapertura de ítems
-- ==============================================================================

create or replace function public.kds_set_item_status(
  p_item_ids uuid[],
  p_status public.order_item_status
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.order_items oi
  set status = p_status,
      status_changed_at = now()
  where oi.id = any(p_item_ids)
    and public.has_restaurant_role(
      oi.restaurant_id,
      array['owner', 'admin', 'kitchen', 'waiter', 'cashier']::public.staff_role[]
    )
    and exists (
      select 1 from public.orders o
      where o.id = oi.order_id 
        and o.restaurant_id = oi.restaurant_id 
        and o.status in ('abierta', 'pagada', 'en_espera')
    )
    and (
      (oi.status = 'pendiente' and p_status in ('preparando', 'listo'))
      or (oi.status = 'preparando' and p_status in ('listo', 'pendiente'))
      or (oi.status = 'listo' and p_status in ('entregado', 'preparando', 'pendiente'))
      or (oi.status = 'entregado' and p_status in ('listo', 'preparando', 'pendiente'))
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
