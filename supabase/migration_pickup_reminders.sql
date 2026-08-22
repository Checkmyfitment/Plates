-- Nudges a buyer as their pickup window approaches, so a confirmed order
-- doesn't get forgotten. Runs entirely in Postgres (pg_cron on a timer,
-- checking every 15 minutes) — no extra edge function needed, since
-- inserting into public.notifications already fires a real push
-- notification via the webhook set up in migration_push_webhook.sql.
-- Only fires for orders whose listing has a structured pickup date/time
-- (listings without one can't be matched to "starting soon"). Standalone
-- and safe to run.

alter table public.orders
  add column if not exists reminder_sent boolean not null default false;

create or replace function public.send_pickup_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, listing_id, message)
  select
    o.buyer_id,
    o.listing_id,
    '⏰ Pickup coming up: ' || l.title || ' from ' || p.name ||
      case when l.pickup_start is not null then ' at ' || to_char(l.pickup_start, 'FMHH12:MI AM') else '' end
  from public.orders o
  join public.listings l on l.id = o.listing_id
  join public.profiles p on p.id = o.seller_id
  where o.status in ('confirmed', 'ready')
    and o.reminder_sent = false
    and l.pickup_date is not null
    and l.pickup_start is not null
    and (l.pickup_date + l.pickup_start) between now() and now() + interval '1 hour';

  update public.orders o
  set reminder_sent = true
  from public.listings l
  where l.id = o.listing_id
    and o.status in ('confirmed', 'ready')
    and o.reminder_sent = false
    and l.pickup_date is not null
    and l.pickup_start is not null
    and (l.pickup_date + l.pickup_start) between now() and now() + interval '1 hour';
end;
$$;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'pickup-reminders';
select cron.schedule('pickup-reminders', '*/15 * * * *', 'select public.send_pickup_reminders();');
