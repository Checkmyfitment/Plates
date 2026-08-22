-- Two small additions:
-- 1. profiles.on_vacation — lets a seller pause all their listings at once
--    without touching each listing's individual sold-out flag.
-- 2. handle_order_status_notify() now also notifies the SELLER when a buyer
--    cancels an order the seller had already confirmed (previously only the
--    buyer ever got cancellation notifications; a buyer cancelling their own
--    still-pending order still doesn't notify anyone, since the seller
--    hasn't acted on it yet).
-- Standalone and safe to run — does not touch or delete existing data.

alter table public.profiles add column if not exists on_vacation boolean not null default false;

create or replace function public.handle_order_status_notify()
returns trigger as $$
declare
  v_message text;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'confirmed' then
    select 'Your order from ' || p.name || ' has been confirmed' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'ready' then
    select 'Your order from ' || p.name || ' is ready for pickup!' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'completed' then
    select 'Your order from ' || p.name || ' is complete — leave a rating?' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'no_show' then
    select 'Your order from ' || p.name || ' was marked as a no-show' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'cancelled' and auth.uid() <> new.buyer_id then
    select 'Your order from ' || p.name || ' was cancelled' into v_message
    from public.profiles p where p.id = new.seller_id;
  end if;

  if v_message is not null then
    insert into public.notifications (user_id, listing_id, message)
    values (new.buyer_id, new.listing_id, v_message);
  end if;

  -- buyer cancelling an order the seller already confirmed (they may have
  -- started preparing it) — let the seller know. A buyer cancelling while
  -- still "pending" doesn't notify the seller, since nothing was in motion.
  if new.status = 'cancelled' and auth.uid() = new.buyer_id and old.status = 'confirmed' then
    insert into public.notifications (user_id, listing_id, message)
    select new.seller_id, new.listing_id, b.name || ' cancelled their order for ' || l.title
    from public.profiles b, public.listings l
    where b.id = new.buyer_id and l.id = new.listing_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- widen the buyer-cancel policy from "pending only" to "pending or
-- confirmed" — the row-level security policy is what actually blocks the
-- update, independent of what the UI shows a Cancel button for
drop policy if exists "Buyers can cancel their own pending orders" on public.orders;
create policy "Buyers can cancel their own orders"
  on public.orders for update
  using (auth.uid() = buyer_id and status in ('pending', 'confirmed'))
  with check (auth.uid() = buyer_id and status = 'cancelled');
