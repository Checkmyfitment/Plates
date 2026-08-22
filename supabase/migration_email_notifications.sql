-- Sends a real email for the same order-lifecycle events that already
-- trigger an in-app/push notification (new order, confirmed, ready,
-- completed, cancelled, no-show, buyer-cancelled-a-confirmed-order) — a
-- fallback for anyone who hasn't turned on push notifications, since most
-- people won't. Deliberately scoped to just these order events, not every
-- in-app notification (e.g. "new listing near you"), so it doesn't become
-- spammy. Requires the send-email edge function to be deployed and a
-- RESEND_API_KEY secret set — see CHECKLIST.md's "Email notifications
-- setup" section. Safe to run even before that's set up: the in-app
-- notification always still gets created either way, the email call just
-- won't succeed yet.

create or replace function public.handle_new_order()
returns trigger as $$
declare
  v_buyer_name text;
  v_listing_title text;
  v_seller_email text;
begin
  select b.name, l.title into v_buyer_name, v_listing_title
  from public.profiles b, public.listings l
  where b.id = new.buyer_id and l.id = new.listing_id;

  insert into public.notifications (user_id, listing_id, message)
  values (new.seller_id, new.listing_id, v_buyer_name || ' ordered ' || new.quantity || 'x ' || v_listing_title);

  select email into v_seller_email from auth.users where id = new.seller_id;
  if v_seller_email is not null then
    perform net.http_post(
      url := 'https://pexmyasywfqkswpblmrq.supabase.co/functions/v1/send-email',
      body := jsonb_build_object(
        'to', v_seller_email,
        'subject', 'New order on Plates',
        'message', v_buyer_name || ' ordered ' || new.quantity || 'x ' || v_listing_title || '. Open Plates to confirm pickup.'
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.handle_order_status_notify()
returns trigger as $$
declare
  v_message text;
  v_buyer_email text;
  v_seller_email text;
  v_buyer_name text;
  v_listing_title text;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'confirmed' then
    select 'Your order from ' || p.name || ' has been confirmed' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'ready' then
    select 'Your order from ' || p.name || ' is ready for pickup!' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'completed' then
    select 'Your order from ' || p.name || ' is complete — leave a rating?' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'no_show' then
    select 'Your order from ' || p.name || ' was marked as a no-show' into v_message
    from public.profiles p where p.id = new.seller_id;
  elsif new.status = 'cancelled' and auth.uid() <> new.buyer_id then
    select 'Your order from ' || p.name || ' was cancelled' into v_message
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

  -- buyer cancelling an order the seller already confirmed — let the
  -- seller know, same as the in-app notification added in
  -- migration_seller_extras.sql
  if new.status = 'cancelled' and auth.uid() = new.buyer_id and old.status = 'confirmed' then
    select b.name, l.title into v_buyer_name, v_listing_title
    from public.profiles b, public.listings l
    where b.id = new.buyer_id and l.id = new.listing_id;

    insert into public.notifications (user_id, listing_id, message)
    values (new.seller_id, new.listing_id, v_buyer_name || ' cancelled their order for ' || v_listing_title);

    select email into v_seller_email from auth.users where id = new.seller_id;
    if v_seller_email is not null then
      perform net.http_post(
        url := 'https://pexmyasywfqkswpblmrq.supabase.co/functions/v1/send-email',
        body := jsonb_build_object(
          'to', v_seller_email,
          'subject', 'Plates order update',
          'message', v_buyer_name || ' cancelled their order for ' || v_listing_title
        ),
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;
