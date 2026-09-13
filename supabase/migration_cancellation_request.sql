-- A buyer cancelling a *confirmed* order used to happen instantly, with no
-- chance for the seller to weigh in — but the seller may have already
-- started (or finished) preparing that food, so an instant cancel isn't
-- always actually possible on their end. This turns that case into a
-- request the seller has to approve or decline, instead of a done deal.
--
-- A buyer cancelling a still-*pending* order is unchanged (instant) —
-- nothing's in motion yet, so there's nothing for the seller to approve.
-- A seller cancelling (either status) is also unchanged — it's always
-- their own call, never something they need to ask permission for.
--
-- Standalone and safe to run — does not touch or delete existing data.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'ready', 'completed', 'cancelled', 'no_show', 'cancel_requested'));

-- Buyers could previously jump straight from 'confirmed' to 'cancelled'.
-- Now that path goes through 'cancel_requested' instead (validated for real
-- by the trigger below); direct 'pending' -> 'cancelled' is untouched.
-- Sellers keep full latitude via their own separate, unchanged policy.
drop policy if exists "Buyers can cancel their own orders" on public.orders;
create policy "Buyers can cancel or request cancellation on their own orders"
  on public.orders for update
  using (auth.uid() = buyer_id and status in ('pending', 'confirmed', 'cancel_requested'))
  with check (auth.uid() = buyer_id and status in ('cancelled', 'cancel_requested', 'confirmed'));

-- RLS's WITH CHECK alone can't see the *old* status, so on its own the
-- policy above would (for example) let a buyer "confirm" their own pending
-- order. This trigger is the real state-machine guard, checked against
-- both OLD and NEW — RLS above just narrows which rows/values are even
-- worth this trigger's time.
create or replace function public.guard_order_status_transition()
returns trigger as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if auth.uid() = old.buyer_id then
    if not (
      (old.status = 'pending' and new.status = 'cancelled') or
      (old.status = 'confirmed' and new.status = 'cancel_requested') or
      (old.status = 'cancel_requested' and new.status = 'confirmed')
    ) then
      raise exception 'Buyers cannot change a % order to %', old.status, new.status;
    end if;
  elsif auth.uid() = old.seller_id then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled')) or
      (old.status = 'confirmed' and new.status in ('ready', 'cancelled')) or
      (old.status = 'ready' and new.status in ('completed', 'no_show')) or
      (old.status = 'cancel_requested' and new.status in ('cancelled', 'confirmed'))
    ) then
      raise exception 'Sellers cannot change a % order to %', old.status, new.status;
    end if;
  end if;
  -- any other caller (admin tooling, service role) is left unrestricted
  -- here — those paths go through their own RPCs already, not raw updates
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists guard_order_status_transition on public.orders;
create trigger guard_order_status_transition
  before update on public.orders
  for each row execute function public.guard_order_status_transition();

-- extend the existing status-change notifier (bell + email) with the two
-- new cases: a buyer's cancellation request (seller needs to know), and a
-- seller declining one (buyer needs to know their order is still on).
-- Approving one already reads correctly through the existing generic
-- 'cancelled' branch below ("Your order from X was cancelled").
create or replace function public.handle_order_status_notify()
returns trigger as $$
declare
  v_message text;
  v_buyer_email text;
  v_seller_email text;
  v_buyer_name text;
  v_listing_title text;
  v_reason_suffix text;
begin
  if new.status = old.status then
    return new;
  end if;

  v_reason_suffix := case
    when new.cancellation_reason is not null and trim(new.cancellation_reason) <> ''
    then ' — ' || trim(new.cancellation_reason)
    else ''
  end;

  if new.status = 'confirmed' and old.status = 'cancel_requested' then
    select 'The seller declined your cancellation request — your order from ' || p.name || ' is still confirmed'
      into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'confirmed' then
    select 'Your order from ' || p.name || ' has been confirmed' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'ready' then
    select 'Your order from ' || p.name ||
      case when new.fulfillment_method = 'delivery' then ' is out for delivery!' else ' is ready for pickup!' end
      into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'completed' then
    select 'Your order from ' || p.name || ' is complete — leave a rating?' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'no_show' then
    select 'Your order from ' || p.name || ' was marked as a no-show' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'cancelled' and auth.uid() <> new.buyer_id then
    select 'Your order from ' || p.name || ' was cancelled' || v_reason_suffix into v_message
    from public.profiles p where p.id = new.seller_id;
  end if;

  if v_message is not null then
    insert into public.notifications (user_id, listing_id, message)
    values (new.buyer_id, new.listing_id, v_message);

    select email into v_buyer_email from auth.users where id = new.buyer_id;
    if v_buyer_email is not null then
      perform net.http_post(
        url := 'https://pexmyasywfqkswpblmrq.supabase.co/functions/v1/send-email',
        body := jsonb_build_object('to', v_buyer_email, 'subject', 'Plates order update', 'message', v_message),
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
    end if;
  end if;

  -- buyer requesting to cancel an order the seller already confirmed (they
  -- may have started preparing it) — the seller needs to approve or
  -- decline this, so make sure they actually see it. A buyer cancelling
  -- while still "pending" stays instant and doesn't notify the seller,
  -- since nothing was in motion.
  if new.status = 'cancel_requested' and auth.uid() = new.buyer_id then
    select b.name, l.title into v_buyer_name, v_listing_title
    from public.profiles b, public.listings l
    where b.id = new.buyer_id and l.id = new.listing_id;

    insert into public.notifications (user_id, listing_id, message)
    values (new.seller_id, new.listing_id, v_buyer_name || ' wants to cancel their order for ' || v_listing_title || v_reason_suffix || ' — approve or decline it');

    select email into v_seller_email from auth.users where id = new.seller_id;
    if v_seller_email is not null then
      perform net.http_post(
        url := 'https://pexmyasywfqkswpblmrq.supabase.co/functions/v1/send-email',
        body := jsonb_build_object(
          'to', v_seller_email,
          'subject', 'Plates order update',
          'message', v_buyer_name || ' wants to cancel their order for ' || v_listing_title || v_reason_suffix || ' — approve or decline it'
        ),
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_status_notify on public.orders;
create trigger on_order_status_notify
  after update on public.orders
  for each row execute function public.handle_order_status_notify();
