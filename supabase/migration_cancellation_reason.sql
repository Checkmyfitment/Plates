-- Lets whoever cancels an order (buyer or seller) leave a short optional
-- note that shows up in the other side's notification -- "cancelled" with
-- zero context was the gap; this closes it without adding a required field.

alter table public.orders add column if not exists cancellation_reason text;

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

  if new.status = 'confirmed' then
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

  -- buyer cancelling an order the seller already confirmed (they may have
  -- started preparing it) — let the seller know. A buyer cancelling while
  -- still "pending" doesn't notify the seller, since nothing was in motion.
  if new.status = 'cancelled' and auth.uid() = new.buyer_id and old.status = 'confirmed' then
    select b.name, l.title into v_buyer_name, v_listing_title
    from public.profiles b, public.listings l
    where b.id = new.buyer_id and l.id = new.listing_id;

    insert into public.notifications (user_id, listing_id, message)
    values (new.seller_id, new.listing_id, v_buyer_name || ' cancelled their order for ' || v_listing_title || v_reason_suffix);

    select email into v_seller_email from auth.users where id = new.seller_id;
    if v_seller_email is not null then
      perform net.http_post(
        url := 'https://pexmyasywfqkswpblmrq.supabase.co/functions/v1/send-email',
        body := jsonb_build_object(
          'to', v_seller_email,
          'subject', 'Plates order update',
          'message', v_buyer_name || ' cancelled their order for ' || v_listing_title || v_reason_suffix
        ),
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;
