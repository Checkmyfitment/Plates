-- Adds a canned seller welcome message whenever a buyer starts a new chat.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- This is a small, standalone addition — it does NOT touch your existing
-- tables or rows, only creates/replaces this one trigger + function.
-- Do NOT re-run the full schema.sql to get this, it would wipe your data.

drop trigger if exists on_chat_created on public.chats;
drop function if exists public.handle_new_chat() cascade;

create function public.handle_new_chat()
returns trigger as $$
declare
  v_listing_title text;
  v_pickup text;
  v_seller_id uuid;
begin
  select title, pickup, seller_id into v_listing_title, v_pickup, v_seller_id
  from public.listings
  where id = new.listing_id;

  if v_seller_id is not null and v_seller_id <> new.buyer_id then
    insert into public.messages (chat_id, sender_id, text)
    values (
      new.id,
      v_seller_id,
      'Hi! Thanks for your interest in the ' || lower(v_listing_title)
        || '. Let me know how many you''d like and I''ll confirm pickup at '
        || coalesce(v_pickup, 'a time that works') || '.'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_chat_created
  after insert on public.chats
  for each row execute procedure public.handle_new_chat();
