-- Seller-facing business intelligence: best-selling item, busiest pickup
-- day, and repeat-customer rate. The existing weekly earnings chart tells
-- a seller how much they made; this tells them something they can
-- actually act on ("your dumplings sell way better than your tamales, and
-- Saturday is your busiest day by far").
--
-- "Busiest day" is measured from when an order was actually marked
-- completed (orders.updated_at, bumped by the existing
-- set_orders_updated_at trigger), not the listing's advertised pickup
-- window text -- that's free-form and inconsistent across sellers, while
-- "when do completions actually happen" is exact and always available.
--
-- Standalone and safe to run — read-only, touches no existing data.

create function public.get_seller_insights()
returns table(
  top_listing_title text,
  top_listing_quantity bigint,
  busiest_day_name text,
  busiest_day_count bigint,
  repeat_buyer_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid();
begin
  return query
  with completed as (
    select o.quantity, o.updated_at, o.buyer_id, l.title as listing_title
    from public.orders o
    join public.listings l on l.id = o.listing_id
    where o.seller_id = v_seller and o.status = 'completed'
  ),
  by_listing as (
    select listing_title, sum(quantity) as qty
    from completed
    group by listing_title
    order by qty desc
    limit 1
  ),
  by_day as (
    select trim(to_char(updated_at, 'Day')) as day_name, count(*) as cnt
    from completed
    group by day_name
    order by cnt desc
    limit 1
  ),
  by_buyer as (
    select buyer_id, count(*) as cnt from completed group by buyer_id
  )
  select
    (select listing_title from by_listing),
    (select qty from by_listing),
    (select day_name from by_day),
    (select cnt from by_day),
    (select case when count(*) = 0 then 0
       else round(100.0 * count(*) filter (where cnt > 1) / count(*), 0)
     end from by_buyer);
end;
$$;

grant execute on function public.get_seller_insights() to authenticated;
