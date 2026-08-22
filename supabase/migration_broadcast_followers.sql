-- Widens a seller's "Message your buyers" broadcast to also reach people
-- who follow their kitchen, not just people with a completed order.
-- Follow exists specifically so someone can hear "I'm cooking again this
-- week" without having ordered yet -- leaving followers out of the one
-- tool built for exactly that message was the gap. Recipients are deduped
-- (a repeat customer who also follows only gets one notification).

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
  select recipient_id, null::uuid, v_seller_name || ': ' || trim(p_message)
  from (
    select o.buyer_id as recipient_id
    from public.orders o
    where o.seller_id = auth.uid() and o.status = 'completed'
    union
    select f.follower_id as recipient_id
    from public.seller_follows f
    where f.seller_id = auth.uid()
  ) recipients;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.broadcast_to_buyers(text) to authenticated;
