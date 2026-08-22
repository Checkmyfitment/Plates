-- Lets buyers ask to be notified when a sold-out listing comes back.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- This is a standalone addition — it does NOT touch your existing tables or
-- rows. It adds a new restock_alerts table, a helper view, and updates the
-- chat-welcome-message trigger so it doesn't fire an extra "thanks for your
-- interest" message when we auto-message a waiting buyer.
-- Do NOT re-run the full schema.sql to get this, it would wipe your data.

-- table of "notify me" requests
create table if not exists public.restock_alerts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

alter table public.restock_alerts enable row level security;

drop policy if exists "Buyers manage their own restock alerts" on public.restock_alerts;
create policy "Buyers manage their own restock alerts"
  on public.restock_alerts for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

drop policy if exists "Sellers can view alerts on their own listings" on public.restock_alerts;
create policy "Sellers can view alerts on their own listings"
  on public.restock_alerts for select
  using (auth.uid() in (select seller_id from public.listings where id = listing_id));

-- how many buyers are waiting on each listing (readable by everyone, just a count)
drop view if exists public.restock_counts;
create view public.restock_counts as
  select listing_id, count(*) as waiting_count
  from public.restock_alerts
  group by listing_id;

-- skip the canned "thanks for your interest" welcome message when a chat is
-- auto-created by the restock notifier below, instead of by a buyer actually
-- opening a chat themselves
create or replace function public.handle_new_chat()
returns trigger as $$
declare
  v_listing_title text;
  v_pickup text;
  v_seller_id uuid;
begin
  if coalesce(current_setting('app.skip_welcome', true), '') = 'true' then
    return new;
  end if;

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

-- when a listing flips from sold out back to available, message every buyer
-- who asked to be notified, then clear their alerts
create or replace function public.handle_listing_restock()
returns trigger as $$
declare
  v_buyer_id uuid;
  v_chat_id uuid;
begin
  if old.available = false and new.available = true then
    perform set_config('app.skip_welcome', 'true', true);

    for v_buyer_id in
      select buyer_id from public.restock_alerts where listing_id = new.id
    loop
      insert into public.chats (listing_id, buyer_id)
      values (new.id, v_buyer_id)
      on conflict (listing_id, buyer_id) do nothing;

      select id into v_chat_id
      from public.chats
      where listing_id = new.id and buyer_id = v_buyer_id;

      insert into public.messages (chat_id, sender_id, text)
      values (
        v_chat_id,
        new.seller_id,
        'Good news — "' || new.title || '" is back in stock!'
      );
    end loop;

    perform set_config('app.skip_welcome', 'false', true);

    delete from public.restock_alerts where listing_id = new.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_listing_restocked on public.listings;
create trigger on_listing_restocked
  after update on public.listings
  for each row execute procedure public.handle_listing_restock();
