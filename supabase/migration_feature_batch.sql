-- Feature batch: verified allergen confirmation, seller minimum order,
-- buyer/seller "mark as paid" recordkeeping, a neighborhood leaderboard,
-- and an admin mass-message tool.

-- 1. Verified allergen info — seller actively confirms per listing instead
-- of allergen info being just another free-text field nobody double-checks.
alter table public.listings
  add column allergens_confirmed boolean not null default false;

-- 2. Optional seller-set minimum order amount per listing.
alter table public.listings
  add column min_order_amount numeric check (min_order_amount is null or (min_order_amount >= 0 and min_order_amount <= 10000));

-- 3. "Mark as paid" — non-binding recordkeeping only, no payment
-- processing. Each side can only ever flip their own flag, enforced by
-- routing through mark_order_paid() below rather than a direct RLS policy,
-- so a buyer can't sneak in changes to any other order column.
alter table public.orders
  add column buyer_marked_paid boolean not null default false,
  add column seller_marked_paid boolean not null default false;

create function public.mark_order_paid(p_order_id uuid, p_paid boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_seller_id uuid;
begin
  select buyer_id, seller_id into v_buyer_id, v_seller_id
  from public.orders where id = p_order_id;

  if v_buyer_id is null then
    raise exception 'order not found';
  end if;

  if auth.uid() = v_buyer_id then
    update public.orders set buyer_marked_paid = p_paid where id = p_order_id;
  elsif auth.uid() = v_seller_id then
    update public.orders set seller_marked_paid = p_paid where id = p_order_id;
  else
    raise exception 'not authorized';
  end if;
end;
$$;

grant execute on function public.mark_order_paid(uuid, boolean) to authenticated;

-- 4. Neighborhood leaderboard — completed-order counts per seller over the
-- last 30 days, so the client can rank "top kitchens" within one
-- neighborhood without a heavier aggregate query on every Browse load.
create view public.neighborhood_leaderboard as
select
  p.id as seller_id,
  p.name,
  p.neighborhood,
  p.avatar_url,
  count(*) as completed_last_30d
from public.orders o
join public.profiles p on p.id = o.seller_id
where o.status = 'completed'
  and o.updated_at >= now() - interval '30 days'
  and p.neighborhood is not null
group by p.id, p.name, p.neighborhood, p.avatar_url;

grant select on public.neighborhood_leaderboard to authenticated, anon;

-- 5. Admin mass-message — the admin UI resolves the target audience (all /
-- sellers / buyers / one neighborhood) to a list of profile ids with a
-- normal SELECT (profiles are already publicly readable), then hands that
-- list to this function to actually write the notifications, since clients
-- have no direct INSERT policy on public.notifications.
create function public.admin_broadcast(p_user_ids uuid[], p_message text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if p_message is null or char_length(trim(p_message)) = 0 then
    raise exception 'message required';
  end if;
  if char_length(p_message) > 500 then
    raise exception 'message must be 500 characters or fewer';
  end if;

  insert into public.notifications (user_id, message)
  select id, p_message from public.profiles where id = any(p_user_ids);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.admin_broadcast(uuid[], text) to authenticated;
