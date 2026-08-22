-- Lets a seller send one message to everyone who's completed an order with
-- them — reuses the existing notifications table (listing_id is left null,
-- which the app already treats as "no specific listing" and just opens
-- Browse when tapped). Standalone and safe to run.

create or replace function public.broadcast_to_buyers(p_message text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_name text;
  v_count integer;
begin
  if public.is_banned(auth.uid()) then
    raise exception 'Your account is currently suspended.';
  end if;
  if length(trim(p_message)) = 0 then
    raise exception 'Message cannot be empty.';
  end if;

  select name into v_seller_name from public.profiles where id = auth.uid();

  insert into public.notifications (user_id, listing_id, message)
  select distinct o.buyer_id, null::uuid, v_seller_name || ': ' || trim(p_message)
  from public.orders o
  where o.seller_id = auth.uid() and o.status = 'completed';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.broadcast_to_buyers(text) to authenticated;
