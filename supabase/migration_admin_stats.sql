-- Admin-only platform stats (total users/sellers/listings/orders, GMV,
-- recent activity) for a "Stats" tab in the admin panel. RLS can't scope a
-- raw multi-table read like this to admins, so it's a security-definer
-- function that checks admin status itself — same pattern as
-- admin_list_users above.
-- Standalone and safe to run — does not touch or delete existing data.

create or replace function public.get_platform_stats()
returns table(
  total_users bigint,
  total_sellers bigint,
  total_listings bigint,
  total_orders bigint,
  completed_orders bigint,
  gmv_completed numeric,
  orders_last_7_days bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select
      (select count(*) from public.profiles),
      (select count(distinct seller_id) from public.listings),
      (select count(*) from public.listings),
      (select count(*) from public.orders),
      (select count(*) from public.orders where status = 'completed'),
      (select coalesce(sum(price_at_order * quantity), 0) from public.orders where status = 'completed'),
      (select count(*) from public.orders where created_at > now() - interval '7 days');
end;
$$;

grant execute on function public.get_platform_stats() to authenticated;
