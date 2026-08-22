-- Three independent, optional additions to listings — none of them change
-- how an existing listing behaves until a seller actually uses the new
-- field. Standalone and safe to run — does not touch or delete existing
-- data.
--
-- 1. photo_urls: additional gallery photos beyond the existing cover photo
--    (photo_url, unchanged — still what shows on cards everywhere). Only
--    the listing detail page reads this array.
-- 2. pickup_date / pickup_start / pickup_end: structured pickup time,
--    alongside (not replacing) the existing free-text `pickup` column.
--    When set, the UI shows the structured version; otherwise it falls
--    back to the old free-text field, so old listings keep working as-is.
-- 3. quantity_available: optional stock count. Leave it null (the
--    default) and a listing works exactly as it does today — sold out is
--    still a manual toggle. Set it to a number and it auto-decrements as
--    orders come in, flipping the listing to sold out at zero.

alter table public.listings add column if not exists photo_urls text[] not null default '{}';
alter table public.listings add column if not exists pickup_date date;
alter table public.listings add column if not exists pickup_start time;
alter table public.listings add column if not exists pickup_end time;
alter table public.listings add column if not exists quantity_available integer check (quantity_available is null or quantity_available >= 0);

-- only decrements when a listing has opted into quantity tracking
-- (quantity_available is not null) — untouched otherwise. Doesn't attempt
-- to restore quantity on a later cancellation/no-show; a seller can always
-- adjust the count by hand from Edit listing, same as the existing manual
-- sold-out toggle.
create or replace function public.handle_order_decrement_quantity()
returns trigger as $$
begin
  update public.listings
  set
    quantity_available = greatest(quantity_available - new.quantity, 0),
    available = case when quantity_available - new.quantity <= 0 then false else available end
  where id = new.listing_id and quantity_available is not null;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_decrement_quantity on public.orders;
create trigger on_order_decrement_quantity
  after insert on public.orders
  for each row execute function public.handle_order_decrement_quantity();
