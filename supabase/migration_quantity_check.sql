-- Defense-in-depth: the client already caps the quantity stepper at
-- listing.quantity_available, but that alone can't stop two buyers from
-- both squeezing in an order for the last item at the same moment (or
-- someone bypassing the UI and calling the API directly). This trigger
-- locks the listing row and rejects an order that would oversell it,
-- so the existing on_order_decrement_quantity trigger never actually
-- needs to floor at zero in practice. Only enforced when a listing has
-- opted into quantity tracking (quantity_available is not null).

create or replace function public.handle_order_check_quantity()
returns trigger as $$
declare
  v_available integer;
begin
  select quantity_available into v_available
  from public.listings
  where id = new.listing_id
  for update;

  if v_available is not null and new.quantity > v_available then
    raise exception 'Only % left — someone may have just ordered ahead of you.', v_available;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_check_quantity on public.orders;
create trigger on_order_check_quantity
  before insert on public.orders
  for each row execute function public.handle_order_check_quantity();
