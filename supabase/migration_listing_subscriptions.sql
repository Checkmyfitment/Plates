-- Recurring orders — a buyer "subscribes" to a listing at a weekly or
-- biweekly interval and it gets reordered automatically, no in-app
-- payment involved (same as every other Plates order: the buyer still
-- pays the seller directly at pickup/delivery, this just saves the
-- buyer from manually re-placing the same order every week).
create table public.listing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  interval_days integer not null default 7 check (interval_days in (7, 14)),
  fulfillment_method text not null default 'pickup' check (fulfillment_method in ('pickup', 'delivery')),
  delivery_address text,
  next_order_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index listing_subscriptions_buyer_id_idx on public.listing_subscriptions (buyer_id);
create index listing_subscriptions_seller_id_idx on public.listing_subscriptions (seller_id);
create index listing_subscriptions_due_idx on public.listing_subscriptions (next_order_date) where active = true;

alter table public.listing_subscriptions enable row level security;

create policy "Buyers manage their own subscriptions"
  on public.listing_subscriptions for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id and not public.is_banned(auth.uid()));

create policy "Sellers can view subscriptions to their listings"
  on public.listing_subscriptions for select
  using (auth.uid() = seller_id);

-- runs daily: places an order for every subscription due today, skipping
-- (and notifying the buyer instead of failing) anything that's currently
-- unavailable — sold out, seller on vacation, listing deleted, or the
-- buyer got banned since subscribing. Always advances next_order_date
-- regardless of outcome, so a permanently-stopped listing doesn't retry
-- forever; the buyer can just cancel from their side if that happens.
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
          fulfillment_method, delivery_address, pickup_code
        )
        values (
          sub.listing_id, sub.buyer_id, sub.seller_id, sub.quantity, v_listing.price,
          sub.fulfillment_method, sub.delivery_address, v_pickup_code
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
    set next_order_date = next_order_date + sub.interval_days
    where id = sub.id;
  end loop;
end;
$$;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'listing-subscriptions';
select cron.schedule('listing-subscriptions', '0 8 * * *', 'select public.place_subscription_orders();');
