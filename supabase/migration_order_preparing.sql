-- Adds a 'preparing' stage between 'confirmed' and 'ready' -- a
-- Domino's-tracker-style step the seller flips on their own once they've
-- actually started cooking, so a buyer isn't stuck staring at "Confirmed"
-- with no idea whether anything is actually happening yet. Sellers update
-- this themselves (see OrderCard.jsx's "Start preparing" button); nothing
-- here infers it automatically.
--
-- Standalone and safe to run — does not touch or delete existing data.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'ready', 'completed', 'cancelled', 'no_show', 'cancel_requested', 'preparing'));

-- the buyer cancellation-request policy's USING clause names the OLD
-- statuses a buyer is even allowed to touch -- 'preparing' has to be added
-- there too, or RLS silently blocks a buyer from requesting cancellation
-- once an order reaches that stage (WITH CHECK is unchanged, it only
-- names the NEW status, which was already fine).
drop policy if exists "Buyers can cancel or request cancellation on their own orders" on public.orders;
create policy "Buyers can cancel or request cancellation on their own orders"
  on public.orders for update
  using (auth.uid() = buyer_id and status in ('pending', 'confirmed', 'preparing', 'cancel_requested'))
  with check (auth.uid() = buyer_id and status in ('cancelled', 'cancel_requested', 'confirmed'));

-- extend the state-machine guard from migration_cancellation_request.sql
-- with the new step: sellers move confirmed -> preparing -> ready instead
-- of confirmed -> ready directly, and a buyer can now request cancellation
-- from 'preparing' too (arguably the case this whole feature exists for —
-- food actively being made). A cancellation decline still reverts to plain
-- 'confirmed' rather than restoring 'preparing' specifically — the seller
-- can just tap "Start preparing" again; not worth a second column to track
-- the exact prior stage.
create or replace function public.guard_order_status_transition()
returns trigger as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if auth.uid() = old.buyer_id then
    if not (
      (old.status = 'pending' and new.status = 'cancelled') or
      (old.status in ('confirmed', 'preparing') and new.status = 'cancel_requested') or
      (old.status = 'cancel_requested' and new.status = 'confirmed')
    ) then
      raise exception 'Buyers cannot change a % order to %', old.status, new.status;
    end if;
  elsif auth.uid() = old.seller_id then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled')) or
      (old.status = 'confirmed' and new.status in ('preparing', 'cancelled')) or
      (old.status = 'preparing' and new.status in ('ready', 'cancelled')) or
      (old.status = 'ready' and new.status in ('completed', 'no_show')) or
      (old.status = 'cancel_requested' and new.status in ('cancelled', 'confirmed'))
    ) then
      raise exception 'Sellers cannot change a % order to %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- extend the status-change notifier (bell + email) with the new stage
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
  elsif new.status = 'preparing' then
    select 'Your order from ' || p.name || ' is being prepared!' into v_message
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
