-- A proper analytics/KPI dashboard for the admin Stats tab. Most of this is
-- computed from data you already have (profiles/listings/orders timestamps)
-- — the only genuinely new thing is a lightweight page-view log, since
-- right now there's zero visibility into top-of-funnel traffic (how many
-- people even open the app, how many look at the signup screen before
-- deciding to sign up). Standalone and safe to run.

-- analytics_events: write-only from the client (insert only, no select
-- grant) — only admins can read it, and only through the RPCs below, same
-- pattern as area_waitlist. Keeps this from becoming a way to snoop on
-- individual users' activity from the client.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at);
create index if not exists analytics_events_type_idx on public.analytics_events (event_type);

alter table public.analytics_events enable row level security;

drop policy if exists "Anyone can log an analytics event" on public.analytics_events;
create policy "Anyone can log an analytics event"
  on public.analytics_events for insert
  with check (true);

-- no select policy on purpose — reads only happen through the
-- security-definer RPCs below, which check is_admin() themselves

-- replaces get_platform_stats with a much larger set of KPIs: growth,
-- activation, order health, and marketplace-quality ratios, not just
-- lifetime totals
drop function if exists public.get_platform_stats();

create function public.get_analytics_summary()
returns table(
  total_users bigint,
  new_users_30d bigint,
  total_sellers bigint,
  active_sellers_30d bigint,
  total_buyers bigint,
  active_buyers_30d bigint,
  repeat_buyers bigint,
  total_listings bigint,
  new_listings_30d bigint,
  total_orders bigint,
  completed_orders bigint,
  cancelled_orders bigint,
  no_show_orders bigint,
  open_orders bigint,
  gmv_completed numeric,
  gmv_last_30d numeric,
  avg_order_value numeric,
  completion_rate numeric,
  repeat_buyer_rate numeric,
  seller_activation_rate numeric,
  buyer_activation_rate numeric,
  total_page_views bigint,
  signup_screen_views bigint,
  signup_conversion_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_users bigint;
  v_total_buyers bigint;
  v_repeat_buyers bigint;
  v_completed bigint;
  v_cancelled bigint;
  v_no_show bigint;
  v_resolved bigint;
  v_total_sellers bigint;
  v_signup_views bigint;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select count(*) into v_total_users from public.profiles;
  select count(distinct seller_id) into v_total_sellers from public.listings;
  select count(distinct buyer_id) into v_total_buyers from public.orders;
  select count(*) into v_completed from public.orders where status = 'completed';
  select count(*) into v_cancelled from public.orders where status = 'cancelled';
  select count(*) into v_no_show from public.orders where status = 'no_show';
  v_resolved := v_completed + v_cancelled + v_no_show;

  select count(*) into v_repeat_buyers
  from (
    select buyer_id from public.orders where status = 'completed'
    group by buyer_id having count(*) >= 2
  ) r;

  select count(*) into v_signup_views
  from public.analytics_events where event_type = 'page_view' and metadata->>'screen' = 'auth';

  return query
    select
      v_total_users,
      (select count(*) from public.profiles where created_at > now() - interval '30 days'),
      v_total_sellers,
      (select count(distinct seller_id) from (
        select seller_id, created_at from public.listings
        union all
        select seller_id, created_at from public.orders
      ) recent where created_at > now() - interval '30 days'),
      v_total_buyers,
      (select count(distinct buyer_id) from public.orders where created_at > now() - interval '30 days'),
      v_repeat_buyers,
      (select count(*) from public.listings),
      (select count(*) from public.listings where created_at > now() - interval '30 days'),
      (select count(*) from public.orders),
      v_completed,
      v_cancelled,
      v_no_show,
      (select count(*) from public.orders where status in ('pending', 'confirmed', 'ready')),
      (select coalesce(sum(price_at_order * quantity), 0) from public.orders where status = 'completed'),
      (select coalesce(sum(price_at_order * quantity), 0) from public.orders where status = 'completed' and created_at > now() - interval '30 days'),
      case when v_completed > 0 then
        (select coalesce(sum(price_at_order * quantity), 0) from public.orders where status = 'completed') / v_completed
      else 0 end,
      case when v_resolved > 0 then round(100.0 * v_completed / v_resolved, 1) else null end,
      case when v_total_buyers > 0 then round(100.0 * v_repeat_buyers / v_total_buyers, 1) else null end,
      case when v_total_users > 0 then round(100.0 * v_total_sellers / v_total_users, 1) else null end,
      case when v_total_users > 0 then round(100.0 * v_total_buyers / v_total_users, 1) else null end,
      (select count(*) from public.analytics_events where event_type = 'page_view'),
      v_signup_views,
      case when v_signup_views > 0 then round(100.0 * v_total_users / v_signup_views, 1) else null end;
end;
$$;

grant execute on function public.get_analytics_summary() to authenticated;

-- weekly counts for the last 12 weeks, one row per week, for the growth
-- charts (new users / new listings / new orders / GMV)
create function public.get_weekly_growth()
returns table(
  week_start date,
  new_users bigint,
  new_listings bigint,
  new_orders bigint,
  gmv numeric
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
    with weeks as (
      select generate_series(
        date_trunc('week', now() - interval '11 weeks'),
        date_trunc('week', now()),
        interval '1 week'
      )::date as week_start
    )
    select
      w.week_start,
      (select count(*) from public.profiles p where date_trunc('week', p.created_at)::date = w.week_start),
      (select count(*) from public.listings l where date_trunc('week', l.created_at)::date = w.week_start),
      (select count(*) from public.orders o where date_trunc('week', o.created_at)::date = w.week_start),
      (select coalesce(sum(o.price_at_order * o.quantity), 0) from public.orders o
        where date_trunc('week', o.created_at)::date = w.week_start and o.status = 'completed')
    from weeks w
    order by w.week_start;
end;
$$;

grant execute on function public.get_weekly_growth() to authenticated;

-- top 5 sellers by completed GMV
create function public.get_top_sellers()
returns table(seller_id uuid, seller_name text, gmv numeric, completed_orders bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select o.seller_id, p.name, sum(o.price_at_order * o.quantity), count(*)
    from public.orders o
    join public.profiles p on p.id = o.seller_id
    where o.status = 'completed'
    group by o.seller_id, p.name
    order by sum(o.price_at_order * o.quantity) desc
    limit 5;
end;
$$;

grant execute on function public.get_top_sellers() to authenticated;

-- top 5 listings by view count
create function public.get_top_listings()
returns table(listing_id uuid, title text, seller_name text, views integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select l.id, l.title, p.name, l.views
    from public.listings l
    join public.profiles p on p.id = l.seller_id
    order by l.views desc
    limit 5;
end;
$$;

grant execute on function public.get_top_listings() to authenticated;

-- top waitlist neighborhoods that don't have a seller yet — the most
-- actionable growth signal in the whole dashboard: exactly where to go
-- recruit sellers next
create function public.get_top_waitlist_neighborhoods()
returns table(neighborhood text, signups bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select w.neighborhood, count(*)
    from public.area_waitlist w
    where w.neighborhood is not null
      and not exists (
        select 1 from public.profiles p
        where p.neighborhood = w.neighborhood
        and exists (select 1 from public.listings l where l.seller_id = p.id)
      )
    group by w.neighborhood
    order by count(*) desc
    limit 5;
end;
$$;

grant execute on function public.get_top_waitlist_neighborhoods() to authenticated;
