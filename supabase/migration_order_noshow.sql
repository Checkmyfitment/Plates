-- Lets a seller mark a "ready for pickup" order as a no-show, instead of
-- it just sitting there forever with no resolution. Distinct from a plain
-- cancellation so it's possible to tell the two apart later (e.g. a buyer
-- with repeat no-shows) — notifies the buyer the same way other status
-- changes do.
-- Standalone and safe to run — does not touch or delete existing data.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'ready', 'completed', 'cancelled', 'no_show'));

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

  return new;
end;
$$ language plpgsql security definer;
