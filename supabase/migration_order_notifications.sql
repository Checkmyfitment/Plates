-- When a seller marks an order completed, nudge the buyer to rate them —
-- reuses the existing in-app notifications system, so no new UI is needed.
-- Standalone and safe to run — does not touch or delete existing data.

create or replace function public.handle_order_completed()
returns trigger as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.notifications (user_id, listing_id, message)
    select new.buyer_id, new.listing_id,
      'Your order from ' || p.name || ' is complete — leave a rating?'
    from public.profiles p
    where p.id = new.seller_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_completed_notify on public.orders;
create trigger on_order_completed_notify
  after update on public.orders
  for each row execute function public.handle_order_completed();
