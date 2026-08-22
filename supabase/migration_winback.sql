-- Win-back nudge for lapsed buyers. If someone who has completed at least
-- one order hasn't ordered again in 21 days, send one relevant nudge (and
-- at most once every 14 days) -- a seller they've bought from before who
-- has something available now, or otherwise a fresh listing in the same
-- cuisine as something they've ordered previously. Reuses the existing
-- notifications table + push webhook (migration_push_webhook.sql), so no
-- new client UI is needed -- it just shows up as a normal notification.
-- Runs on a daily pg_cron timer. Standalone and safe to run.

alter table public.profiles
  add column if not exists last_winback_sent_at timestamptz;

create or replace function public.send_winback_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with lapsed_buyers as (
    select distinct o.buyer_id
    from public.orders o
    join public.profiles p on p.id = o.buyer_id
    where o.status = 'completed'
      and p.banned = false
      and (p.last_winback_sent_at is null or p.last_winback_sent_at < now() - interval '14 days')
      and not exists (
        select 1 from public.orders o2
        where o2.buyer_id = o.buyer_id and o2.created_at > now() - interval '21 days'
      )
  ),
  previous_seller_pick as (
    select distinct on (lb.buyer_id)
      lb.buyer_id,
      l.id as listing_id,
      '👋 ' || seller.name || ' just posted ' || l.title || ' — you ordered from them before' as message
    from lapsed_buyers lb
    join public.orders o on o.buyer_id = lb.buyer_id and o.status = 'completed'
    join public.profiles seller on seller.id = o.seller_id
    join public.listings l on l.seller_id = seller.id
    where seller.on_vacation = false
      and seller.banned = false
      and l.available = true
      and l.seller_id <> lb.buyer_id
    order by lb.buyer_id, l.created_at desc
  ),
  cuisine_pick as (
    select distinct on (lb.buyer_id)
      lb.buyer_id,
      l.id as listing_id,
      '🍽️ New ' || l.cuisine || ' near you: ' || l.title as message
    from lapsed_buyers lb
    join public.orders o on o.buyer_id = lb.buyer_id and o.status = 'completed'
    join public.listings past_l on past_l.id = o.listing_id and past_l.cuisine is not null
    join public.listings l on l.cuisine = past_l.cuisine and l.available = true and l.seller_id <> lb.buyer_id
    join public.profiles seller on seller.id = l.seller_id and seller.on_vacation = false and seller.banned = false
    where lb.buyer_id not in (select buyer_id from previous_seller_pick)
    order by lb.buyer_id, l.created_at desc
  ),
  picks as (
    select * from previous_seller_pick
    union all
    select * from cuisine_pick
  ),
  inserted as (
    insert into public.notifications (user_id, listing_id, message)
    select buyer_id, listing_id, message from picks
    returning user_id
  )
  update public.profiles
  set last_winback_sent_at = now()
  where id in (select user_id from inserted);
end;
$$;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'winback-notifications';
select cron.schedule('winback-notifications', '0 15 * * *', 'select public.send_winback_notifications();');
