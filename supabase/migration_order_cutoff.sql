-- Lets a seller stop taking new orders some number of hours before their
-- pickup window starts, so they're not scrambling with a last-minute order
-- while everything's already prepped. Only enforced when a listing has both
-- a structured pickup date/time AND a cutoff set — listings without those
-- are untouched. Standalone and safe to run.

alter table public.listings
  add column if not exists order_cutoff_hours integer check (order_cutoff_hours is null or order_cutoff_hours >= 0);

create or replace function public.handle_order_check_cutoff()
returns trigger as $$
declare
  v_pickup_date date;
  v_pickup_start time;
  v_cutoff_hours integer;
begin
  select pickup_date, pickup_start, order_cutoff_hours
    into v_pickup_date, v_pickup_start, v_cutoff_hours
  from public.listings
  where id = new.listing_id;

  if v_cutoff_hours is not null and v_pickup_date is not null and v_pickup_start is not null then
    if now() > (v_pickup_date + v_pickup_start) - (v_cutoff_hours || ' hours')::interval then
      raise exception 'Orders have closed for this pickup window.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_check_cutoff on public.orders;
create trigger on_order_check_cutoff
  before insert on public.orders
  for each row execute function public.handle_order_check_cutoff();
