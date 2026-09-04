-- Notifies a seller's followers when they come off vacation mode.
-- restock_alerts already covers "this specific sold-out listing is back";
-- this covers "this seller I follow is open for orders again" -- there
-- was previously no signal at all when a seller un-paused.

create function public.handle_seller_vacation_ended()
returns trigger as $$
begin
  if old.on_vacation = true and new.on_vacation = false then
    insert into public.notifications (user_id, message)
    select follower_id, new.name || ' is back and taking orders again!'
    from public.seller_follows
    where seller_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_seller_vacation_ended
  after update on public.profiles
  for each row execute procedure public.handle_seller_vacation_ended();
