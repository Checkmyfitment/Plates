-- Gives a seller their own last-8-weeks earnings trend, the same shape
-- admin's get_weekly_growth() already produces for the platform as a
-- whole, so the existing WeeklyBarChart component can render it as-is.
-- Always scoped to auth.uid() -- there's no seller_id parameter, so there's
-- nothing to check beyond "is someone logged in."

create or replace function public.get_seller_weekly_earnings()
returns table(
  week_start date,
  gmv numeric,
  order_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    with weeks as (
      select generate_series(
        date_trunc('week', now() - interval '7 weeks'),
        date_trunc('week', now()),
        interval '1 week'
      )::date as week_start
    )
    select
      w.week_start,
      (select coalesce(sum(o.price_at_order * o.quantity), 0) from public.orders o
        where o.seller_id = auth.uid() and o.status = 'completed'
        and date_trunc('week', o.created_at)::date = w.week_start),
      (select count(*) from public.orders o
        where o.seller_id = auth.uid() and o.status = 'completed'
        and date_trunc('week', o.created_at)::date = w.week_start)
    from weeks w
    order by w.week_start;
end;
$$;

grant execute on function public.get_seller_weekly_earnings() to authenticated;
