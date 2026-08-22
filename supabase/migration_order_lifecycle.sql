-- Adds a "ready for pickup" step to the order lifecycle (pending ->
-- confirmed -> ready -> completed, or cancelled at any point before
-- completed), and notifies both sides at the right moments: the seller as
-- soon as a buyer places an order, and the buyer when the seller confirms,
-- marks it ready, marks it completed, or cancels it (not when the buyer
-- cancels their own order — they already know).
--
-- Supersedes the single "completed" trigger from
-- migration_order_notifications.sql — this migration replaces it with a
-- combined trigger covering all four buyer-facing status changes, plus the
-- new seller-facing "new order" trigger. Safe to run even if you never ran
-- migration_order_notifications.sql at all.
-- Standalone and safe to run — does not touch or delete existing data.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'ready', 'completed', 'cancelled'));

-- notify the seller as soon as a buyer places an order
create or replace function public.handle_new_order()
returns trigger as $$
begin
  insert into public.notifications (user_id, listing_id, message)
  select new.seller_id, new.listing_id,
    b.name || ' ordered ' || new.quantity || 'x ' || l.title
  from public.profiles b, public.listings l
  where b.id = new.buyer_id and l.id = new.listing_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_created_notify on public.orders;
create trigger on_order_created_notify
  after insert on public.orders
  for each row execute function public.handle_new_order();

-- notify the buyer as the seller moves their order along — skips a status
-- change the buyer made themselves (e.g. cancelling their own pending order)
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
  elsif new.status = 'cancelled' and auth.uid() <> new.buyer_id then
    select 'Your order from ' || p.name || ' was cancelled' into v_message
    from public.profiles p where p.id = new.seller_id;
  end if;

  if v_message is not null then
    insert into public.notifications (user_id, listing_id, message)
    values (new.buyer_id, new.listing_id, v_message);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_completed_notify on public.orders;
drop function if exists public.handle_order_completed() cascade;

drop trigger if exists on_order_status_notify on public.orders;
create trigger on_order_status_notify
  after update on public.orders
  for each row execute function public.handle_order_status_notify();
