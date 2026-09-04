-- Makes recurring (subscription) orders visible to sellers ahead of time,
-- and gives buyers a heads-up before one auto-places. Two gaps in the
-- original recurring-orders feature (migration_listing_subscriptions.sql):
-- 1. An auto-placed order looked identical to a one-time order -- a
--    seller running a real standing-order business (meal prep, weekly
--    subscribers) couldn't tell which pending orders were recurring, or
--    see how many standing subscribers they even had before the orders
--    landed.
-- 2. A buyer only found out their subscription order was placed *after*
--    the fact -- no chance to skip a week without remembering to cancel.

alter table public.orders
  add column subscription_id uuid references public.listing_subscriptions(id) on delete set null;

create index orders_subscription_id_idx on public.orders (subscription_id) where subscription_id is not null;

-- tracks whether the day-before heads-up has gone out for the *current*
-- next_order_date -- reset to false every time place_subscription_orders()
-- advances to a new cycle, so each cycle gets exactly one reminder
alter table public.listing_subscriptions
  add column upcoming_reminder_sent boolean not null default false;

-- same as the original, plus: tags each auto-placed order with its
-- subscription_id, and resets upcoming_reminder_sent when advancing to
-- the next cycle
create or replace function public.place_subscription_orders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sub record;
  v_listing record;
  v_pickup_code text;
begin
  for sub in
    select * from public.listing_subscriptions
    where active = true and next_order_date <= current_date
  loop
    begin
      select l.id, l.available, l.quantity_available, l.price, l.title, l.unclaimed_store_id,
             p.on_vacation, p.banned
      into v_listing
      from public.listings l
      join public.profiles p on p.id = l.seller_id
      where l.id = sub.listing_id;

      if v_listing.id is null
         or v_listing.unclaimed_store_id is not null
         or v_listing.available = false
         or v_listing.on_vacation = true
         or v_listing.banned = true
         or (v_listing.quantity_available is not null and v_listing.quantity_available < sub.quantity)
         or public.is_banned(sub.buyer_id)
      then
        insert into public.notifications (user_id, listing_id, message)
        values (
          sub.buyer_id,
          sub.listing_id,
          'Skipped this week''s automatic order for ' || coalesce(v_listing.title, 'a listing') ||
            ' — it looks unavailable right now. Order manually if you still want it, or cancel the subscription from your profile.'
        );
      else
        v_pickup_code := case
          when sub.fulfillment_method = 'pickup' then (1000 + floor(random() * 9000))::text
          else null
        end;

        insert into public.orders (
          listing_id, buyer_id, seller_id, quantity, price_at_order,
          fulfillment_method, delivery_address, pickup_code, subscription_id
        )
        values (
          sub.listing_id, sub.buyer_id, sub.seller_id, sub.quantity, v_listing.price,
          sub.fulfillment_method, sub.delivery_address, v_pickup_code, sub.id
        );

        insert into public.notifications (user_id, listing_id, message)
        values (
          sub.buyer_id,
          sub.listing_id,
          '🔁 Your recurring order for ' || v_listing.title || ' was placed automatically.'
        );
      end if;
    exception when others then
      insert into public.notifications (user_id, listing_id, message)
      values (
        sub.buyer_id,
        sub.listing_id,
        'Couldn''t place this week''s automatic order — please order manually if you still want it.'
      );
    end;

    update public.listing_subscriptions
    set next_order_date = next_order_date + sub.interval_days,
        upcoming_reminder_sent = false
    where id = sub.id;
  end loop;
end;
$$;

-- runs daily: notifies the buyer one day before their subscription is due
-- to auto-place, so they have a chance to skip/cancel instead of finding
-- out after the fact. Only ever sends once per cycle (upcoming_reminder_sent).
create or replace function public.send_subscription_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sub record;
begin
  for sub in
    select ls.id, ls.buyer_id, ls.listing_id, l.title as listing_title
    from public.listing_subscriptions ls
    join public.listings l on l.id = ls.listing_id
    where ls.active = true
      and ls.upcoming_reminder_sent = false
      and ls.next_order_date = current_date + 1
  loop
    insert into public.notifications (user_id, listing_id, message)
    values (
      sub.buyer_id,
      sub.listing_id,
      '🔁 Heads up — your recurring order for ' || sub.listing_title ||
        ' will be placed automatically tomorrow. Cancel anytime from your profile if you don''t want it this time.'
    );

    update public.listing_subscriptions set upcoming_reminder_sent = true where id = sub.id;
  end loop;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'subscription-reminders';
select cron.schedule('subscription-reminders', '0 9 * * *', 'select public.send_subscription_reminders();');
