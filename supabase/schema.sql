-- Plates database schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- Safe to re-run: clears out any previous attempt at these objects first.

drop function if exists public.delete_my_account() cascade;
drop function if exists public.send_winback_notifications() cascade;
drop function if exists public.admin_broadcast(uuid[], text) cascade;
drop view if exists public.neighborhood_leaderboard;
drop function if exists public.mark_order_paid(uuid, boolean) cascade;
drop function if exists public.claim_store(text) cascade;
drop view if exists public.unclaimed_store_public;
drop table if exists public.unclaimed_stores cascade;
drop function if exists public.admin_list_users(text) cascade;
drop function if exists public.get_platform_stats() cascade;
drop function if exists public.increment_listing_views(uuid) cascade;
drop trigger if exists protect_listing_admin_fields_trigger on public.listings;
drop function if exists public.protect_listing_admin_fields() cascade;
drop table if exists public.promotion_requests cascade;
drop table if exists public.push_subscriptions cascade;
drop trigger if exists on_listing_created_notify on public.listings;
drop function if exists public.handle_new_listing_alert_matches() cascade;
drop table if exists public.notifications cascade;
drop table if exists public.listing_alerts cascade;
drop table if exists public.seller_follows cascade;
drop view if exists public.schedule_reservation_counts;
drop table if exists public.schedule_reservations cascade;
drop table if exists public.listing_schedules cascade;
drop view if exists public.pickup_slot_counts;
drop table if exists public.pickup_reservations cascade;
drop table if exists public.pickup_slots cascade;
drop table if exists public.listing_subscriptions cascade;
drop view if exists public.seller_trust_stats;
drop view if exists public.seller_response_stats;
drop table if exists public.reports cascade;
drop view if exists public.restock_counts;
drop table if exists public.restock_alerts cascade;
drop function if exists public.handle_listing_restock() cascade;
drop view if exists public.seller_ratings;
drop table if exists public.reviews cascade;
drop function if exists public.handle_new_chat() cascade;
drop view if exists public.trending_sellers;
drop trigger if exists on_order_status_notify on public.orders;
drop function if exists public.handle_order_status_notify() cascade;
drop trigger if exists on_order_created_notify on public.orders;
drop function if exists public.handle_new_order() cascade;
drop trigger if exists on_order_completed_notify on public.orders;
drop function if exists public.handle_order_completed() cascade;
drop trigger if exists set_orders_updated_at on public.orders;
drop function if exists public.handle_orders_updated_at() cascade;
drop table if exists public.orders cascade;
drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.favorites cascade;
drop table if exists public.listings cascade;
drop trigger if exists on_auth_user_phone_verified on auth.users;
drop function if exists public.handle_phone_verified() cascade;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop trigger if exists protect_profile_admin_fields_trigger on public.profiles;
drop function if exists public.protect_profile_admin_fields() cascade;
drop function if exists public.is_banned(uuid) cascade;
drop function if exists public.is_admin(uuid) cascade;
drop table if exists public.profiles cascade;

-- profiles: one row per signed-up user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'New cook',
  kitchen text check (kitchen is null or char_length(kitchen) <= 300),
  avatar_url text,
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 100),
  lat double precision,
  lng double precision,
  is_admin boolean not null default false,
  banned boolean not null default false,
  referred_by uuid references public.profiles(id) on delete set null,
  area_alerts_enabled boolean not null default false,
  on_vacation boolean not null default false,
  -- mirrors auth.users.phone_confirmed_at via a trigger below -- never the
  -- actual phone number, just a boolean trust signal other users can see
  phone_verified boolean not null default false,
  -- pre-fills the "Pickup note" field on new listings, so a seller who
  -- always hands off from the same spot doesn't retype it every time
  default_pickup_note text check (default_pickup_note is null or char_length(default_pickup_note) <= 150),
  -- throttles send_winback_notifications() to at most one nudge per 14 days
  last_winback_sent_at timestamptz,
  -- explicit override for chat translation target; falls back to the
  -- browser's own language when null
  preferred_language text,
  -- set by delete_my_account() below -- treated like `banned`: signed out
  -- and blocked from using this account again
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- small helpers so later policies don't repeat the same subquery
create function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

create function public.is_banned(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce((select banned from public.profiles where id = uid), false);
$$;

-- prevent a non-admin from granting themselves admin or un-banning
-- themselves through a normal profile insert/update. Direct SQL run from
-- the Supabase dashboard (no auth.uid()) is left untouched, so a developer
-- can still bootstrap the very first admin with a plain SQL update. OLD
-- doesn't exist on INSERT, so that case is branched separately.
create function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if TG_OP = 'INSERT' then
      new.is_admin := false;
      new.banned := false;
    else
      new.is_admin := old.is_admin;
      new.banned := old.banned;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_admin_fields_trigger
  before insert or update on public.profiles
  for each row execute function public.protect_profile_admin_fields();

-- admins can moderate any profile (e.g. to ban someone), on top of the
-- "users can update their own profile" policy above
create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin(auth.uid()));

-- lets an admin search every signed-up user by name or email (email lives
-- on auth.users, which the client can't query directly) — the function
-- itself checks admin status, so it's safe to expose to any authenticated
-- caller; non-admins just get an error back
create function public.admin_list_users(q text default null)
returns table(id uuid, name text, email text, is_admin boolean, banned boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select p.id, p.name, u.email::text, p.is_admin, p.banned, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where q is null or q = '' or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%'
    order by p.created_at desc
    limit 50;
end;
$$;

grant execute on function public.admin_list_users(text) to authenticated;

-- admin-only platform stats (total users/sellers/listings/orders, GMV,
-- recent activity) for a "Stats" tab in the admin panel. RLS can't scope a
-- raw multi-table read like this to admins, so it's a security-definer
-- (the old get_platform_stats() lived here — superseded by
-- get_analytics_summary() and friends, defined in the analytics dashboard
-- block near the end of this file)

-- auto-create a profile row whenever someone signs up, optionally recording
-- who referred them (an invite link can pass a referred_by id; anything
-- malformed or pointing at a user that doesn't exist falls back to null)
create function public.handle_new_user()
returns trigger as $$
declare
  v_referred_by uuid;
begin
  begin
    v_referred_by := nullif(new.raw_user_meta_data->>'referred_by', '')::uuid;
  exception when others then
    v_referred_by := null;
  end;

  if v_referred_by is not null and not exists (select 1 from public.profiles where id = v_referred_by) then
    v_referred_by := null;
  end if;

  insert into public.profiles (id, name, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    v_referred_by
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- phone verification: lets a user verify their phone via Supabase Auth's
-- built-in SMS OTP (supabase.auth.updateUser({phone}) then verifyOtp with
-- type 'phone_change'), requires an SMS provider configured in the
-- Supabase Dashboard. This trigger mirrors the confirmation as a public
-- boolean so other users can see a "Phone verified" badge.
create function public.handle_phone_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.phone_confirmed_at is not null and old.phone_confirmed_at is null then
    update public.profiles set phone_verified = true where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_phone_verified
  after update of phone_confirmed_at on auth.users
  for each row execute procedure public.handle_phone_verified();

-- self-service account deletion: anonymizes the profile instead of hard-
-- deleting the row -- orders/reviews/messages involving this person are
-- other users' records too (a seller's income history, a buyer's review),
-- and profiles.id cascades into orders on both buyer_id and seller_id, so
-- a true hard delete would silently destroy other people's transaction
-- history. deleted_at is treated like the existing banned flag by the
-- client -- signed out and blocked from using that account again.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set name = 'Deleted user',
      avatar_url = null,
      kitchen = null,
      neighborhood = null,
      lat = null,
      lng = null,
      default_pickup_note = null,
      preferred_language = null,
      deleted_at = now()
  where id = auth.uid();

  update public.listings set available = false where seller_id = auth.uid();

  update public.listing_subscriptions
  set active = false, cancelled_at = now()
  where buyer_id = auth.uid() and active = true;
end;
$$;

-- unclaimed_stores: lets an admin pre-seed the marketplace by posting on
-- behalf of a real cook found elsewhere (Facebook, word of mouth) who isn't
-- signed up yet. Listings can point at one of these instead of a real
-- seller; a claim_code lets the real owner take over everything at once
-- once they're ready to sign up (see claim_store below).
create table public.unclaimed_stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kitchen text,
  neighborhood text,
  contact_note text,
  claim_code text not null unique default gen_random_uuid()::text,
  created_by uuid references public.profiles(id) on delete set null,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  -- geocoded from the admin-typed neighborhood text via geocodeArea(), same
  -- flow a seller's own profile uses -- lets an unclaimed store show a real
  -- map pin and distance instead of just a text label
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

alter table public.unclaimed_stores enable row level security;

-- deliberately admin-only — claim_code lives on this table, and anyone who
-- can read it could claim someone else's store before the real owner does.
-- Buyer-facing listing/store info is exposed separately below, through a
-- view that leaves claim_code out entirely.
create policy "Admins manage unclaimed stores"
  on public.unclaimed_stores for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- buyer-safe subset (no claim_code, no created_by/claimed_by) — views run
-- with the owner's privileges, so this is selectable by anyone even though
-- the underlying table is admin-only, same pattern as pickup_slot_counts
create view public.unclaimed_store_public as
  select id, name, kitchen, neighborhood, contact_note, lat, lng
  from public.unclaimed_stores;

-- listings
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 100),
  price numeric not null default 0 check (price >= 0 and price <= 10000),
  unit text not null default 'each' check (char_length(unit) <= 30),
  tag text,
  tag_type text,
  cuisine text,
  diet text[] not null default '{}',
  photo text default '🍽️',
  photo_url text,
  photo_urls text[] not null default '{}',
  bg text default '#F1ECDD',
  allergens text[] not null default '{}',
  made text,
  pickup text check (pickup is null or char_length(pickup) <= 150),
  pickup_date date,
  pickup_start time,
  pickup_end time,
  quantity_available integer check (quantity_available is null or quantity_available >= 0),
  -- hours before pickup_start after which new orders stop being accepted;
  -- only enforced when pickup_date/pickup_start are also set
  order_cutoff_hours integer check (order_cutoff_hours is null or order_cutoff_hours >= 0),
  description text check (description is null or char_length(description) <= 1000),
  available boolean not null default true,
  delivery_available boolean not null default false,
  delivery_notes text check (delivery_notes is null or char_length(delivery_notes) <= 300),
  views integer not null default 0,
  featured boolean not null default false,
  unclaimed_store_id uuid references public.unclaimed_stores(id) on delete set null,
  -- seller actively confirms allergen info is accurate for this listing,
  -- rather than the free-text allergens field being trusted by default
  allergens_confirmed boolean not null default false,
  -- optional per-listing minimum order amount the seller requires
  min_order_amount numeric check (min_order_amount is null or (min_order_amount >= 0 and min_order_amount <= 10000)),
  -- seller's affirmative claim that they're legally permitted to sell under
  -- their state/local cottage food laws -- not a legal opinion or guarantee
  cottage_law_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;

create policy "Listings are viewable by everyone"
  on public.listings for select
  using (true);

create policy "Users can insert their own listings"
  on public.listings for insert
  with check (auth.uid() = seller_id and not public.is_banned(auth.uid()));

create policy "Users can update their own listings"
  on public.listings for update
  using (auth.uid() = seller_id);

create policy "Users can delete their own listings"
  on public.listings for delete
  using (auth.uid() = seller_id);

create policy "Admins can update any listing"
  on public.listings for update
  using (public.is_admin(auth.uid()));

create policy "Admins can delete any listing"
  on public.listings for delete
  using (public.is_admin(auth.uid()));

-- prevent a seller from marking their own (or anyone's) listing featured —
-- same pattern as protect_profile_admin_fields above, including on INSERT
create function public.protect_listing_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if TG_OP = 'INSERT' then
      new.featured := false;
    else
      new.featured := old.featured;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_listing_admin_fields_trigger
  before insert or update on public.listings
  for each row execute function public.protect_listing_admin_fields();

-- promotion_requests: lets a seller request their own listing be featured,
-- instead of only an admin deciding. Payment happens off platform for now
-- (an admin manually confirms and approves) — built ahead of wiring a real
-- Stripe charge to it later
create table public.promotion_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- only one open request per listing at a time
create unique index promotion_requests_pending_unique
  on public.promotion_requests (listing_id)
  where status = 'pending';

alter table public.promotion_requests enable row level security;

create policy "Sellers and admins can view promotion requests"
  on public.promotion_requests for select
  using (auth.uid() = seller_id or public.is_admin(auth.uid()));

create policy "Sellers can request a promotion for their own listing"
  on public.promotion_requests for insert
  with check (
    auth.uid() = seller_id
    and not public.is_banned(auth.uid())
    and auth.uid() in (select seller_id from public.listings where id = listing_id)
  );

create policy "Admins can review promotion requests"
  on public.promotion_requests for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- anyone signed in can bump a listing's view count (it's just a counter,
-- and a plain client update would fail RLS since the viewer isn't the
-- seller), but nothing else about the row can change through this path
create function public.increment_listing_views(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings set views = views + 1 where id = p_listing_id;
end;
$$;

grant execute on function public.increment_listing_views(uuid) to authenticated;

-- lets any signed-in user claim a store by its (unguessable, uuid) claim
-- code: transfers every listing posted under that store to their own
-- account and fills in their kitchen/neighborhood if they haven't set one
create function public.claim_store(p_claim_code text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.unclaimed_stores%rowtype;
begin
  if public.is_banned(auth.uid()) then
    raise exception 'Your account is suspended and can''t claim a store.';
  end if;

  select * into v_store from public.unclaimed_stores s where s.claim_code = p_claim_code;

  if v_store.id is null then
    raise exception 'That claim link isn''t valid.';
  end if;

  if v_store.claimed_by is not null then
    raise exception 'This store has already been claimed.';
  end if;

  update public.unclaimed_stores
  set claimed_by = auth.uid(), claimed_at = now()
  where unclaimed_stores.id = v_store.id;

  update public.listings
  set seller_id = auth.uid(), unclaimed_store_id = null
  where listings.unclaimed_store_id = v_store.id;

  update public.profiles
  set kitchen = coalesce(profiles.kitchen, v_store.kitchen),
      neighborhood = coalesce(profiles.neighborhood, v_store.neighborhood)
  where profiles.id = auth.uid();

  return query select v_store.id, v_store.name;
end;
$$;

grant execute on function public.claim_store(text) to authenticated;

-- favorites (saved listings)
create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.favorites enable row level security;

create policy "Users manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- chats (one per buyer + listing)
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  unique (listing_id, buyer_id)
);

alter table public.chats enable row level security;

create policy "Participants can view their chats"
  on public.chats for select
  using (
    auth.uid() = buyer_id
    or auth.uid() in (select seller_id from public.listings where id = listing_id)
  );

create policy "Buyers can start chats"
  on public.chats for insert
  with check (auth.uid() = buyer_id and not public.is_banned(auth.uid()));

create policy "Participants can update their chats"
  on public.chats for update
  using (
    auth.uid() = buyer_id
    or auth.uid() in (select seller_id from public.listings where id = listing_id)
  );

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text check (text is null or char_length(text) <= 1000),
  photo_url text,
  created_at timestamptz not null default now(),
  constraint messages_text_or_photo_check check (text is not null or photo_url is not null)
);

alter table public.messages enable row level security;

create policy "Participants can view messages"
  on public.messages for select
  using (
    auth.uid() in (
      select buyer_id from public.chats where id = chat_id
      union
      select seller_id from public.listings l join public.chats c on c.listing_id = l.id where c.id = chat_id
    )
  );

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and not public.is_banned(auth.uid())
    and auth.uid() in (
      select buyer_id from public.chats where id = chat_id
      union
      select seller_id from public.listings l join public.chats c on c.listing_id = l.id where c.id = chat_id
    )
  );

-- reviews (vendor ratings)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  taste_rating smallint check (taste_rating between 1 and 5),
  portion_rating smallint check (portion_rating between 1 and 5),
  value_rating smallint check (value_rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  -- set only through reply_to_review() below, never a direct column update,
  -- so a seller can touch these two fields on their own reviews and nothing else
  seller_reply text check (seller_reply is null or char_length(seller_reply) <= 500),
  seller_reply_at timestamptz,
  unique (seller_id, reviewer_id)
);

alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

-- the "Users can leave reviews for other sellers" insert policy is defined
-- further down, after the orders table exists — it requires a completed
-- order between reviewer and seller

create policy "Users can update their own reviews"
  on public.reviews for update
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id and reviewer_id <> seller_id);

create policy "Users can delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = reviewer_id);

-- aggregate view: average rating + count per seller, plus per-dimension averages
create view public.seller_ratings as
  select
    seller_id,
    round(avg(rating)::numeric, 1) as avg_rating,
    count(*) as review_count,
    round(avg(taste_rating)::numeric, 1) as avg_taste,
    round(avg(portion_rating)::numeric, 1) as avg_portion,
    round(avg(value_rating)::numeric, 1) as avg_value
  from public.reviews
  group by seller_id;

-- auto-send a canned seller welcome message whenever a buyer starts a chat
create function public.handle_new_chat()
returns trigger as $$
declare
  v_listing_title text;
  v_pickup text;
  v_seller_id uuid;
begin
  -- skip the canned welcome message when a chat is auto-created by the
  -- restock notifier below, instead of by a buyer actually opening a chat
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

create trigger on_chat_created
  after insert on public.chats
  for each row execute procedure public.handle_new_chat();

-- orders: structured buyer orders (quantity, note, status), replacing the
-- informal "just message the seller" flow — no payment processing, buyers
-- and sellers still arrange payment/pickup themselves
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0 and quantity <= 99),
  note text check (note is null or char_length(note) <= 500),
  price_at_order numeric not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'ready', 'completed', 'cancelled', 'no_show')),
  -- tags order rows placed together in one multi-item checkout from the
  -- same seller, so the UI can group/act on them as one unit; null means
  -- "not part of a group" (every single-item order)
  cart_id uuid,
  -- how the buyer wants this order fulfilled — 'delivery' only meaningful
  -- when the seller has delivery_available on the listing; delivery_address
  -- is required client-side when fulfillment_method = 'delivery'
  fulfillment_method text not null default 'pickup' check (fulfillment_method in ('pickup', 'delivery')),
  delivery_address text check (delivery_address is null or char_length(delivery_address) <= 200),
  -- flips to true once send_pickup_reminders() has notified the buyer, so
  -- the periodic job below never sends the same reminder twice
  reminder_sent boolean not null default false,
  -- shown to the buyer, entered by the seller at handoff to confirm the
  -- right person is picking up -- generated client-side, one shared code
  -- per cart checkout; a lightweight trust check, not a security boundary
  pickup_code text,
  -- optional short note from whoever cancels, shown to the other side
  -- instead of a bare "cancelled" with no context
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 140),
  -- non-binding "I paid" / "I got paid" recordkeeping only — no payment
  -- processing involved. Only ever flipped through mark_order_paid() below,
  -- never a direct column update, so each side can only touch their own flag
  buyer_marked_paid boolean not null default false,
  seller_marked_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_buyer_id_idx on public.orders (buyer_id);
create index orders_seller_id_idx on public.orders (seller_id);
create index orders_cart_id_idx on public.orders (cart_id);

alter table public.orders enable row level security;

create policy "Buyers and sellers can view their own orders"
  on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Buyers can place orders"
  on public.orders for insert
  with check (auth.uid() = buyer_id and buyer_id <> seller_id and not public.is_banned(auth.uid()));

create policy "Buyers can cancel their own orders"
  on public.orders for update
  using (auth.uid() = buyer_id and status in ('pending', 'confirmed'))
  with check (auth.uid() = buyer_id and status = 'cancelled');

create policy "Sellers can update status on their own orders"
  on public.orders for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

create function public.handle_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.handle_orders_updated_at();

-- non-binding "I paid" / "I got paid" recordkeeping toggle — no payment
-- processing involved. Routed through this function rather than a direct
-- RLS update policy so each side can only ever flip their own flag, never
-- touch quantity/status/price on an order that isn't theirs to change
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

-- notify the seller as soon as a buyer places an order, plus an email
-- fallback (see migration_email_notifications.sql) for anyone who hasn't
-- turned on push notifications
create function public.handle_new_order()
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

create trigger on_order_created_notify
  after insert on public.orders
  for each row execute function public.handle_new_order();

-- only decrements when a listing has opted into quantity tracking
-- (quantity_available is not null) — untouched otherwise
create function public.handle_order_decrement_quantity()
returns trigger as $$
begin
  update public.listings
  set
    quantity_available = greatest(quantity_available - new.quantity, 0),
    available = case when quantity_available - new.quantity <= 0 then false else available end
  where id = new.listing_id and quantity_available is not null;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_decrement_quantity
  after insert on public.orders
  for each row execute function public.handle_order_decrement_quantity();

-- defense-in-depth against overselling: the client caps the quantity
-- stepper at quantity_available, but this locks the listing row and
-- rejects an order that would exceed remaining stock, so two buyers
-- racing for the last item can't both succeed
create function public.handle_order_check_quantity()
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

create trigger on_order_check_quantity
  before insert on public.orders
  for each row execute function public.handle_order_check_quantity();

-- listing_subscriptions: recurring orders — a buyer "subscribes" to a
-- listing at a weekly or biweekly interval and it gets reordered
-- automatically. No in-app payment involved, same as every other Plates
-- order — the buyer still pays the seller directly, this just saves them
-- from manually re-placing the same order every week.
create table public.listing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  interval_days integer not null default 7 check (interval_days in (7, 14)),
  fulfillment_method text not null default 'pickup' check (fulfillment_method in ('pickup', 'delivery')),
  delivery_address text,
  next_order_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index listing_subscriptions_buyer_id_idx on public.listing_subscriptions (buyer_id);
create index listing_subscriptions_seller_id_idx on public.listing_subscriptions (seller_id);
create index listing_subscriptions_due_idx on public.listing_subscriptions (next_order_date) where active = true;

alter table public.listing_subscriptions enable row level security;

create policy "Buyers manage their own subscriptions"
  on public.listing_subscriptions for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id and not public.is_banned(auth.uid()));

create policy "Sellers can view subscriptions to their listings"
  on public.listing_subscriptions for select
  using (auth.uid() = seller_id);

-- runs daily: places an order for every subscription due today, skipping
-- (and notifying the buyer instead of failing) anything that's currently
-- unavailable — sold out, seller on vacation, listing deleted, or the
-- buyer got banned since subscribing. Always advances next_order_date
-- regardless of outcome, so a permanently-stopped listing doesn't retry
-- forever; the buyer can just cancel from their side if that happens.
create or replace function public.place_subscription_orders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sub record;
  v_listing record;
  v_pickup_code text;
begin
  for sub in
    select * from public.listing_subscriptions
    where active = true and next_order_date <= current_date
  loop
    begin
      select l.id, l.available, l.quantity_available, l.price, l.title, l.unclaimed_store_id,
             p.on_vacation, p.banned
      into v_listing
      from public.listings l
      join public.profiles p on p.id = l.seller_id
      where l.id = sub.listing_id;

      if v_listing.id is null
         or v_listing.unclaimed_store_id is not null
         or v_listing.available = false
         or v_listing.on_vacation = true
         or v_listing.banned = true
         or (v_listing.quantity_available is not null and v_listing.quantity_available < sub.quantity)
         or public.is_banned(sub.buyer_id)
      then
        insert into public.notifications (user_id, listing_id, message)
        values (
          sub.buyer_id,
          sub.listing_id,
          'Skipped this week''s automatic order for ' || coalesce(v_listing.title, 'a listing') ||
            ' — it looks unavailable right now. Order manually if you still want it, or cancel the subscription from your profile.'
        );
      else
        v_pickup_code := case
          when sub.fulfillment_method = 'pickup' then (1000 + floor(random() * 9000))::text
          else null
        end;

        insert into public.orders (
          listing_id, buyer_id, seller_id, quantity, price_at_order,
          fulfillment_method, delivery_address, pickup_code
        )
        values (
          sub.listing_id, sub.buyer_id, sub.seller_id, sub.quantity, v_listing.price,
          sub.fulfillment_method, sub.delivery_address, v_pickup_code
        );

        insert into public.notifications (user_id, listing_id, message)
        values (
          sub.buyer_id,
          sub.listing_id,
          '🔁 Your recurring order for ' || v_listing.title || ' was placed automatically.'
        );
      end if;
    exception when others then
      insert into public.notifications (user_id, listing_id, message)
      values (
        sub.buyer_id,
        sub.listing_id,
        'Couldn''t place this week''s automatic order — please order manually if you still want it.'
      );
    end;

    update public.listing_subscriptions
    set next_order_date = next_order_date + sub.interval_days
    where id = sub.id;
  end loop;
end;
$$;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'listing-subscriptions';
select cron.schedule('listing-subscriptions', '0 8 * * *', 'select public.place_subscription_orders();');

-- rejects a new order once it's past the seller's cutoff (order_cutoff_hours
-- before pickup_start) — only enforced when a listing has both a structured
-- pickup date/time and a cutoff set
create function public.handle_order_check_cutoff()
returns trigger as $$
declare
  v_pickup_date date;
  v_pickup_start time;
  v_cutoff_hours integer;
begin
  select pickup_date, pickup_start, order_cutoff_hours
    into v_pickup_date, v_pickup_start, v_cutoff_hours
  from public.listings
  where id = new.listing_id;

  if v_cutoff_hours is not null and v_pickup_date is not null and v_pickup_start is not null then
    if now() > (v_pickup_date + v_pickup_start) - (v_cutoff_hours || ' hours')::interval then
      raise exception 'Orders have closed for this pickup window.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_check_cutoff
  before insert on public.orders
  for each row execute function public.handle_order_check_cutoff();

-- notify the buyer as the seller moves their order along (confirmed, ready,
-- completed, or cancelled) — skips a status change the buyer made
-- themselves (e.g. cancelling their own pending order)
create function public.handle_order_status_notify()
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

create trigger on_order_status_notify
  after update on public.orders
  for each row execute function public.handle_order_status_notify();

-- restricts leaving a new review to buyers who've actually completed an
-- order with that seller — prevents review-bombing or drive-by reviews
-- from someone who's never ordered. Defined here (not alongside the rest
-- of the reviews table policies above) since it depends on public.orders
create policy "Users can leave reviews for other sellers"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and reviewer_id <> seller_id
    and not public.is_banned(auth.uid())
    and exists (
      select 1 from public.orders o
      where o.buyer_id = reviewer_id
        and o.seller_id = reviews.seller_id
        and o.status = 'completed'
    )
  );

-- lets a seller post one public reply to a review on their own kitchen.
-- Goes through this RPC rather than a direct update policy so a seller can
-- only ever touch the reply columns on their own reviews, never the
-- rating or comment itself. Passing an empty/whitespace reply clears it.
create function public.reply_to_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
begin
  select seller_id into v_seller_id from public.reviews where id = p_review_id;
  if v_seller_id is null then
    raise exception 'Review not found.';
  end if;
  if v_seller_id <> auth.uid() then
    raise exception 'not authorized';
  end if;
  if public.is_banned(auth.uid()) then
    raise exception 'Your account is currently suspended.';
  end if;

  update public.reviews
  set seller_reply = nullif(trim(p_reply), ''),
      seller_reply_at = case when nullif(trim(p_reply), '') is null then null else now() end
  where id = p_review_id;
end;
$$;

grant execute on function public.reply_to_review(uuid, text) to authenticated;

-- "this week's trending kitchens": top-20 ranked view blending recent
-- orders, favorites, and reviews (last 7 days), weighted so a sale counts
-- for more than a save which counts for more than nothing. Unclaimed-store
-- listings are excluded — no real seller account/kitchen to rank. Returns
-- the top 20 (not just 5) with lat/lng, so the client can re-rank down to a
-- final top-5 blending in the viewer's own location for "trending near you"
create view public.trending_sellers as
with recent_orders as (
  select seller_id, count(*) * 3 as score
  from public.orders
  where created_at > now() - interval '7 days'
    and status not in ('cancelled', 'no_show')
  group by seller_id
),
recent_favorites as (
  select l.seller_id, count(*) * 1 as score
  from public.favorites f
  join public.listings l on l.id = f.listing_id
  where f.created_at > now() - interval '7 days'
    and l.unclaimed_store_id is null
  group by l.seller_id
),
recent_reviews as (
  select seller_id, count(*) * 2 as score
  from public.reviews
  where created_at > now() - interval '7 days'
  group by seller_id
),
combined as (
  select seller_id, score from recent_orders
  union all
  select seller_id, score from recent_favorites
  union all
  select seller_id, score from recent_reviews
),
totals as (
  select seller_id, sum(score) as trending_score
  from combined
  group by seller_id
)
select
  p.id as seller_id,
  p.name,
  p.avatar_url,
  p.kitchen,
  p.neighborhood,
  p.lat,
  p.lng,
  t.trending_score,
  row_number() over (order by t.trending_score desc) as rank
from totals t
join public.profiles p on p.id = t.seller_id
order by t.trending_score desc
limit 20;

-- restock_alerts: buyers asking to be notified when a sold-out listing returns
create table public.restock_alerts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

alter table public.restock_alerts enable row level security;

create policy "Buyers manage their own restock alerts"
  on public.restock_alerts for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create policy "Sellers can view alerts on their own listings"
  on public.restock_alerts for select
  using (auth.uid() in (select seller_id from public.listings where id = listing_id));

-- how many buyers are waiting on each listing
create view public.restock_counts as
  select listing_id, count(*) as waiting_count
  from public.restock_alerts
  group by listing_id;

-- when a listing flips from sold out back to available, message every buyer
-- who asked to be notified, then clear their alerts
create function public.handle_listing_restock()
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

create trigger on_listing_restocked
  after update on public.listings
  for each row execute procedure public.handle_listing_restock();

-- reports: buyers/sellers flagging a listing or seller for review
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can create reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can view their own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "Admins can view all reports"
  on public.reports for select
  using (public.is_admin(auth.uid()));

create policy "Admins can update reports"
  on public.reports for update
  using (public.is_admin(auth.uid()));

-- aggregate view: how quickly each seller typically replies to messages
create view public.seller_response_stats as
with ordered as (
  select
    m.chat_id,
    m.sender_id,
    m.created_at,
    l.seller_id,
    lag(m.sender_id) over (partition by m.chat_id order by m.created_at) as prev_sender,
    lag(m.created_at) over (partition by m.chat_id order by m.created_at) as prev_created_at
  from public.messages m
  join public.chats c on c.id = m.chat_id
  join public.listings l on l.id = c.listing_id
),
responses as (
  select
    seller_id,
    extract(epoch from (created_at - prev_created_at)) as response_seconds
  from ordered
  where sender_id = seller_id
    and prev_sender is not null
    and prev_sender <> seller_id
    and created_at - prev_created_at < interval '2 days'
)
select
  seller_id,
  round(avg(response_seconds) / 60.0) as avg_response_minutes,
  count(*) as response_count
from responses
group by seller_id;

-- a single computed "is this seller reliable" signal, in the spirit of
-- Etsy's Star Seller badge — combines order completion, no-shows, and
-- ratings (each already tracked separately) into one trust signal
create or replace view public.seller_trust_stats as
with order_stats as (
  select
    seller_id,
    count(*) filter (where status = 'completed') as completed_count,
    count(*) filter (where status = 'no_show') as no_show_count,
    count(*) filter (where status in ('completed', 'cancelled', 'no_show')) as terminal_count
  from public.orders
  group by seller_id
)
select
  p.id as seller_id,
  coalesce(os.completed_count, 0) as completed_count,
  coalesce(os.no_show_count, 0) as no_show_count,
  case
    when coalesce(os.terminal_count, 0) = 0 then null
    else round(100.0 * os.completed_count / os.terminal_count)
  end as completion_rate,
  sr.avg_rating,
  sr.review_count,
  (
    coalesce(os.completed_count, 0) >= 5
    and coalesce(os.terminal_count, 0) > 0
    and (100.0 * os.completed_count / os.terminal_count) >= 90
    and coalesce(sr.avg_rating, 0) >= 4.5
    and coalesce(sr.review_count, 0) >= 3
    and coalesce(os.no_show_count, 0) = 0
  ) as is_top_rated
from public.profiles p
left join order_stats os on os.seller_id = p.id
left join public.seller_ratings sr on sr.seller_id = p.id;

grant select on public.seller_trust_stats to authenticated, anon;

-- pickup_slots: seller-published pickup time windows for a listing
create table public.pickup_slots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int,
  created_at timestamptz not null default now()
);

alter table public.pickup_slots enable row level security;

create policy "Pickup slots are viewable by everyone"
  on public.pickup_slots for select
  using (true);

create policy "Sellers manage slots on their own listings"
  on public.pickup_slots for all
  using (auth.uid() in (select seller_id from public.listings where id = listing_id))
  with check (auth.uid() in (select seller_id from public.listings where id = listing_id));

-- pickup_reservations: a buyer's lightweight "I'm coming" RSVP to a slot
create table public.pickup_reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.pickup_slots(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (slot_id, buyer_id)
);

alter table public.pickup_reservations enable row level security;

create policy "Buyers manage their own reservations"
  on public.pickup_reservations for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create policy "Sellers can view reservations on their own slots"
  on public.pickup_reservations for select
  using (
    auth.uid() in (
      select l.seller_id
      from public.pickup_slots s
      join public.listings l on l.id = s.listing_id
      where s.id = slot_id
    )
  );

-- public headcount per slot, so buyers can see "3/5 spots taken" without
-- needing select access to everyone else's reservation rows
create view public.pickup_slot_counts as
  select slot_id, count(*) as reserved_count
  from public.pickup_reservations
  group by slot_id;

-- listing_schedules: recurring weekly "cook schedule" for pre-order/batch
-- cooking listings — e.g. "tamales every Tuesday and Friday" — distinct
-- from pickup_slots above (one-off windows for food that's already made).
-- Buyers pre-order into a specific upcoming calendar date computed from
-- this weekly pattern; schedule_reservations.occurrence_date tracks that.
create table public.listing_schedules (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  pickup_start time not null,
  pickup_end time not null,
  capacity int,
  created_at timestamptz not null default now()
);

alter table public.listing_schedules enable row level security;

create policy "Listing schedules are viewable by everyone"
  on public.listing_schedules for select
  using (true);

create policy "Sellers manage schedules on their own listings"
  on public.listing_schedules for all
  using (auth.uid() in (select seller_id from public.listings where id = listing_id))
  with check (auth.uid() in (select seller_id from public.listings where id = listing_id));

create table public.schedule_reservations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.listing_schedules(id) on delete cascade,
  occurrence_date date not null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (schedule_id, occurrence_date, buyer_id)
);

alter table public.schedule_reservations enable row level security;

create policy "Buyers manage their own schedule reservations"
  on public.schedule_reservations for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id and not public.is_banned(auth.uid()));

create policy "Sellers can view reservations on their own schedules"
  on public.schedule_reservations for select
  using (
    auth.uid() in (
      select l.seller_id
      from public.listing_schedules s
      join public.listings l on l.id = s.listing_id
      where s.id = schedule_id
    )
  );

create view public.schedule_reservation_counts as
  select schedule_id, occurrence_date, count(*) as reserved_count
  from public.schedule_reservations
  group by schedule_id, occurrence_date;

-- listing_alerts: buyers following a cuisine for "new listing near you" alerts
create table public.listing_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cuisine text not null,
  created_at timestamptz not null default now(),
  unique (user_id, cuisine)
);

alter table public.listing_alerts enable row level security;

create policy "Users manage their own listing alerts"
  on public.listing_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- seller_follows: buyers following a specific seller ("kitchen"), separate
-- from following a cuisine (listing_alerts above) or an area
-- (profiles.area_alerts_enabled)
create table public.seller_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, seller_id)
);

alter table public.seller_follows enable row level security;

create policy "Seller follows are viewable by everyone"
  on public.seller_follows for select
  using (true);

create policy "Users manage their own seller follows"
  on public.seller_follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id and follower_id <> seller_id and not public.is_banned(auth.uid()));

-- notifications: in-app; a row here can also trigger a real push
-- notification via the send-push edge function (see push_subscriptions below)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- lets a seller send one message to everyone who's completed an order
-- with them or who follows their kitchen — listing_id is left null, which
-- the app already treats as "no specific listing" and just opens Browse
-- when tapped. Recipients are deduped (union, not union all) so a repeat
-- customer who also follows only gets one notification.
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

-- a lightweight email capture for visitors whose neighborhood doesn't have
-- any sellers yet — works for guests too, no account needed to join
create table public.area_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  neighborhood text,
  created_at timestamptz not null default now(),
  unique (email)
);

alter table public.area_waitlist enable row level security;

-- no direct insert/update policy for anon/authenticated on purpose —
-- everything goes through the function below instead, which runs as its
-- owner (bypassing RLS internally) and only needs an EXECUTE grant; the
-- standard, safer pattern for this kind of public write in Supabase
create policy "Admins can view the waitlist"
  on public.area_waitlist for select
  using (public.is_admin(auth.uid()));

create function public.join_area_waitlist(p_email text, p_neighborhood text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Email is required.';
  end if;

  insert into public.area_waitlist (email, neighborhood)
  values (lower(trim(p_email)), nullif(trim(coalesce(p_neighborhood, '')), ''))
  on conflict (email) do update set neighborhood = excluded.neighborhood;
end;
$$;

grant execute on function public.join_area_waitlist(text, text) to anon, authenticated;

-- whenever a new listing is posted, notify: everyone directly following
-- that seller, everyone following that cuisine, and everyone within 10
-- miles with area alerts on (skipping unclaimed-store listings for the
-- area path — no accurate seller location yet) — picking exactly one
-- notification per user even if they'd match more than one way, since a
-- direct seller-follow is the most specific signal, then cuisine, then area
create function public.handle_new_listing_alert_matches()
returns trigger as $$
declare
  v_seller_lat double precision;
  v_seller_lng double precision;
begin
  select lat, lng into v_seller_lat, v_seller_lng from public.profiles where id = new.seller_id;

  with all_matches as (
    select sf.follower_id as user_id, 1 as priority,
           seller.name || ' just posted: "' || new.title || '"' as message
    from public.seller_follows sf
    join public.profiles seller on seller.id = new.seller_id
    where sf.seller_id = new.seller_id
      and sf.follower_id <> new.seller_id

    union all

    select la.user_id, 2,
           'New ' || new.cuisine || ' listing near you: "' || new.title || '"'
    from public.listing_alerts la
    where la.cuisine = new.cuisine
      and la.user_id <> new.seller_id

    union all

    select p.id, 3,
           'New listing near you: "' || new.title || '"'
    from public.profiles p
    where new.unclaimed_store_id is null
      and p.area_alerts_enabled = true
      and p.id <> new.seller_id
      and p.lat is not null and p.lng is not null
      and v_seller_lat is not null and v_seller_lng is not null
      and (
        3958.8 * acos(
          least(1, greatest(-1,
            cos(radians(p.lat)) * cos(radians(v_seller_lat)) * cos(radians(v_seller_lng) - radians(p.lng))
            + sin(radians(p.lat)) * sin(radians(v_seller_lat))
          ))
        )
      ) <= 10
  ),
  best as (
    select distinct on (user_id) user_id, message
    from all_matches
    order by user_id, priority
  )
  insert into public.notifications (user_id, listing_id, message)
  select user_id, new.id, message from best;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_listing_created_notify
  after insert on public.listings
  for each row execute procedure public.handle_new_listing_alert_matches();

-- push_subscriptions: one row per browser/device a user has enabled push
-- notifications on. The send-push edge function reads this table (as the
-- service role, bypassing RLS) whenever a new row lands in notifications.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage buckets for listing photos and avatars, replacing base64-in-the-
-- database uploads. These live in the storage schema, not public, so they
-- aren't touched by the drop statements at the top of this file — the
-- inserts/policies below are idempotent on their own.
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "listing-photos public read"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "listing-photos owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_banned(auth.uid())
  );

create policy "listing-photos owner update"
  on storage.objects for update
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "listing-photos owner delete"
  on storage.objects for delete
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_banned(auth.uid())
  );

create policy "avatars owner update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

insert into storage.buckets (id, name, public)
values ('chat-photos', 'chat-photos', true)
on conflict (id) do nothing;

create policy "chat-photos public read"
  on storage.objects for select
  using (bucket_id = 'chat-photos');

create policy "chat-photos owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_banned(auth.uid())
  );

create policy "chat-photos owner update"
  on storage.objects for update
  using (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat-photos owner delete"
  on storage.objects for delete
  using (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime (live updates without a manual reload) for chat messages, the
-- notification bell, and order status — respects the same RLS policies
-- already defined above
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Nudges a buyer as their pickup window approaches (only for listings with
-- a structured pickup date/time). Runs on a 15-minute pg_cron timer —
-- inserting into public.notifications already fires a real push
-- notification via the webhook in migration_push_webhook.sql, so no extra
-- edge function is needed here.
create or replace function public.send_pickup_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, listing_id, message)
  select
    o.buyer_id,
    o.listing_id,
    '⏰ Pickup coming up: ' || l.title || ' from ' || p.name ||
      case when l.pickup_start is not null then ' at ' || to_char(l.pickup_start, 'FMHH12:MI AM') else '' end
  from public.orders o
  join public.listings l on l.id = o.listing_id
  join public.profiles p on p.id = o.seller_id
  where o.status in ('confirmed', 'ready')
    and o.reminder_sent = false
    and l.pickup_date is not null
    and l.pickup_start is not null
    and (l.pickup_date + l.pickup_start) between now() and now() + interval '1 hour';

  update public.orders o
  set reminder_sent = true
  from public.listings l
  where l.id = o.listing_id
    and o.status in ('confirmed', 'ready')
    and o.reminder_sent = false
    and l.pickup_date is not null
    and l.pickup_start is not null
    and (l.pickup_date + l.pickup_start) between now() and now() + interval '1 hour';
end;
$$;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'pickup-reminders';
select cron.schedule('pickup-reminders', '*/15 * * * *', 'select public.send_pickup_reminders();');

-- Win-back nudge for lapsed buyers: someone who has completed an order but
-- hasn't ordered again in 21 days gets one relevant nudge, at most every 14
-- days -- a seller they've bought from before who has something available
-- now, or otherwise a fresh listing in the same cuisine as something they've
-- ordered previously. Reuses the same notifications+push pipeline above.
create or replace function public.send_winback_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with lapsed_buyers as (
    select distinct o.buyer_id
    from public.orders o
    join public.profiles p on p.id = o.buyer_id
    where o.status = 'completed'
      and p.banned = false
      and (p.last_winback_sent_at is null or p.last_winback_sent_at < now() - interval '14 days')
      and not exists (
        select 1 from public.orders o2
        where o2.buyer_id = o.buyer_id and o2.created_at > now() - interval '21 days'
      )
  ),
  previous_seller_pick as (
    select distinct on (lb.buyer_id)
      lb.buyer_id,
      l.id as listing_id,
      '👋 ' || seller.name || ' just posted ' || l.title || ' — you ordered from them before' as message
    from lapsed_buyers lb
    join public.orders o on o.buyer_id = lb.buyer_id and o.status = 'completed'
    join public.profiles seller on seller.id = o.seller_id
    join public.listings l on l.seller_id = seller.id
    where seller.on_vacation = false
      and seller.banned = false
      and l.available = true
      and l.seller_id <> lb.buyer_id
    order by lb.buyer_id, l.created_at desc
  ),
  cuisine_pick as (
    select distinct on (lb.buyer_id)
      lb.buyer_id,
      l.id as listing_id,
      '🍽️ New ' || l.cuisine || ' near you: ' || l.title as message
    from lapsed_buyers lb
    join public.orders o on o.buyer_id = lb.buyer_id and o.status = 'completed'
    join public.listings past_l on past_l.id = o.listing_id and past_l.cuisine is not null
    join public.listings l on l.cuisine = past_l.cuisine and l.available = true and l.seller_id <> lb.buyer_id
    join public.profiles seller on seller.id = l.seller_id and seller.on_vacation = false and seller.banned = false
    where lb.buyer_id not in (select buyer_id from previous_seller_pick)
    order by lb.buyer_id, l.created_at desc
  ),
  picks as (
    select * from previous_seller_pick
    union all
    select * from cuisine_pick
  ),
  inserted as (
    insert into public.notifications (user_id, listing_id, message)
    select buyer_id, listing_id, message from picks
    returning user_id
  )
  update public.profiles
  set last_winback_sent_at = now()
  where id in (select user_id from inserted);
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'winback-notifications';
select cron.schedule('winback-notifications', '0 15 * * *', 'select public.send_winback_notifications();');

-- Analytics dashboard: a lightweight page-view log (the only genuinely new
-- data collected — everything else below is computed from tables that
-- already exist) plus the KPI functions behind the admin Stats tab.

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_created_at_idx on public.analytics_events (created_at);
create index analytics_events_type_idx on public.analytics_events (event_type);

alter table public.analytics_events enable row level security;

-- no insert or select policy on purpose — writes go through
-- log_page_view() below (security definer, bypasses RLS) and reads only
-- happen through the get_* RPCs further down, which check is_admin()
-- themselves. Same pattern as area_waitlist/join_area_waitlist.

create function public.log_page_view(p_screen text, p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_events (event_type, user_id, metadata)
  values ('page_view', p_user_id, jsonb_build_object('screen', p_screen));
end;
$$;

grant execute on function public.log_page_view(text, uuid) to anon, authenticated;

create function public.get_analytics_summary()
returns table(
  total_users bigint,
  new_users_30d bigint,
  total_sellers bigint,
  active_sellers_30d bigint,
  total_buyers bigint,
  active_buyers_30d bigint,
  repeat_buyers bigint,
  total_listings bigint,
  new_listings_30d bigint,
  total_orders bigint,
  completed_orders bigint,
  cancelled_orders bigint,
  no_show_orders bigint,
  open_orders bigint,
  gmv_completed numeric,
  gmv_last_30d numeric,
  avg_order_value numeric,
  completion_rate numeric,
  repeat_buyer_rate numeric,
  seller_activation_rate numeric,
  buyer_activation_rate numeric,
  total_page_views bigint,
  signup_screen_views bigint,
  signup_conversion_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_users bigint;
  v_total_buyers bigint;
  v_repeat_buyers bigint;
  v_completed bigint;
  v_cancelled bigint;
  v_no_show bigint;
  v_resolved bigint;
  v_total_sellers bigint;
  v_signup_views bigint;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select count(*) into v_total_users from public.profiles;
  select count(distinct seller_id) into v_total_sellers from public.listings;
  select count(distinct buyer_id) into v_total_buyers from public.orders;
  select count(*) into v_completed from public.orders where status = 'completed';
  select count(*) into v_cancelled from public.orders where status = 'cancelled';
  select count(*) into v_no_show from public.orders where status = 'no_show';
  v_resolved := v_completed + v_cancelled + v_no_show;

  select count(*) into v_repeat_buyers
  from (
    select buyer_id from public.orders where status = 'completed'
    group by buyer_id having count(*) >= 2
  ) r;

  select count(*) into v_signup_views
  from public.analytics_events where event_type = 'page_view' and metadata->>'screen' = 'auth';

  return query
    select
      v_total_users,
      (select count(*) from public.profiles where created_at > now() - interval '30 days'),
      v_total_sellers,
      (select count(distinct seller_id) from (
        select seller_id, created_at from public.listings
        union all
        select seller_id, created_at from public.orders
      ) recent where created_at > now() - interval '30 days'),
      v_total_buyers,
      (select count(distinct buyer_id) from public.orders where created_at > now() - interval '30 days'),
      v_repeat_buyers,
      (select count(*) from public.listings),
      (select count(*) from public.listings where created_at > now() - interval '30 days'),
      (select count(*) from public.orders),
      v_completed,
      v_cancelled,
      v_no_show,
      (select count(*) from public.orders where status in ('pending', 'confirmed', 'ready')),
      (select coalesce(sum(price_at_order * quantity), 0) from public.orders where status = 'completed'),
      (select coalesce(sum(price_at_order * quantity), 0) from public.orders where status = 'completed' and created_at > now() - interval '30 days'),
      case when v_completed > 0 then
        (select coalesce(sum(price_at_order * quantity), 0) from public.orders where status = 'completed') / v_completed
      else 0 end,
      case when v_resolved > 0 then round(100.0 * v_completed / v_resolved, 1) else null end,
      case when v_total_buyers > 0 then round(100.0 * v_repeat_buyers / v_total_buyers, 1) else null end,
      case when v_total_users > 0 then round(100.0 * v_total_sellers / v_total_users, 1) else null end,
      case when v_total_users > 0 then round(100.0 * v_total_buyers / v_total_users, 1) else null end,
      (select count(*) from public.analytics_events where event_type = 'page_view'),
      v_signup_views,
      case when v_signup_views > 0 then round(100.0 * v_total_users / v_signup_views, 1) else null end;
end;
$$;

grant execute on function public.get_analytics_summary() to authenticated;

-- weekly counts for the last 12 weeks, one row per week, for the growth
-- charts (new users / new listings / new orders / GMV)
create function public.get_weekly_growth()
returns table(
  week_start date,
  new_users bigint,
  new_listings bigint,
  new_orders bigint,
  gmv numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    with weeks as (
      select generate_series(
        date_trunc('week', now() - interval '11 weeks'),
        date_trunc('week', now()),
        interval '1 week'
      )::date as week_start
    )
    select
      w.week_start,
      (select count(*) from public.profiles p where date_trunc('week', p.created_at)::date = w.week_start),
      (select count(*) from public.listings l where date_trunc('week', l.created_at)::date = w.week_start),
      (select count(*) from public.orders o where date_trunc('week', o.created_at)::date = w.week_start),
      (select coalesce(sum(o.price_at_order * o.quantity), 0) from public.orders o
        where date_trunc('week', o.created_at)::date = w.week_start and o.status = 'completed')
    from weeks w
    order by w.week_start;
end;
$$;

grant execute on function public.get_weekly_growth() to authenticated;

-- a seller's own last-8-weeks earnings trend -- same shape as
-- get_weekly_growth() above so WeeklyBarChart can render it unchanged.
-- Always scoped to auth.uid(), no seller_id parameter to check.
create function public.get_seller_weekly_earnings()
returns table(
  week_start date,
  gmv numeric,
  order_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    with weeks as (
      select generate_series(
        date_trunc('week', now() - interval '7 weeks'),
        date_trunc('week', now()),
        interval '1 week'
      )::date as week_start
    )
    select
      w.week_start,
      (select coalesce(sum(o.price_at_order * o.quantity), 0) from public.orders o
        where o.seller_id = auth.uid() and o.status = 'completed'
        and date_trunc('week', o.created_at)::date = w.week_start),
      (select count(*) from public.orders o
        where o.seller_id = auth.uid() and o.status = 'completed'
        and date_trunc('week', o.created_at)::date = w.week_start)
    from weeks w
    order by w.week_start;
end;
$$;

grant execute on function public.get_seller_weekly_earnings() to authenticated;

-- top 5 sellers by completed GMV
create function public.get_top_sellers()
returns table(seller_id uuid, seller_name text, gmv numeric, completed_orders bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select o.seller_id, p.name, sum(o.price_at_order * o.quantity), count(*)
    from public.orders o
    join public.profiles p on p.id = o.seller_id
    where o.status = 'completed'
    group by o.seller_id, p.name
    order by sum(o.price_at_order * o.quantity) desc
    limit 5;
end;
$$;

grant execute on function public.get_top_sellers() to authenticated;

-- top 5 listings by view count
create function public.get_top_listings()
returns table(listing_id uuid, title text, seller_name text, views integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select l.id, l.title, p.name, l.views
    from public.listings l
    join public.profiles p on p.id = l.seller_id
    order by l.views desc
    limit 5;
end;
$$;

grant execute on function public.get_top_listings() to authenticated;

-- top waitlist neighborhoods that don't have a seller yet — the most
-- actionable growth signal in the whole dashboard: exactly where to go
-- recruit sellers next
create function public.get_top_waitlist_neighborhoods()
returns table(neighborhood text, signups bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select w.neighborhood, count(*)
    from public.area_waitlist w
    where w.neighborhood is not null
      and not exists (
        select 1 from public.profiles p
        where p.neighborhood = w.neighborhood
        and exists (select 1 from public.listings l where l.seller_id = p.id)
      )
    group by w.neighborhood
    order by count(*) desc
    limit 5;
end;
$$;

grant execute on function public.get_top_waitlist_neighborhoods() to authenticated;

-- A lightweight tracker for manual seller-recruiting outreach — you find a
-- home cook selling food on Facebook Marketplace/Nextdoor/Craigslist/etc.,
-- message them yourself from your own account, and log it here so you're
-- not losing track across dozens of manual DMs. Nothing here sends
-- anything automatically. Admin-only.

create table public.outreach_leads (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'other'
    check (platform in ('facebook_marketplace', 'craigslist', 'nextdoor', 'instagram', 'other')),
  contact_name text not null,
  contact_info text,
  listing_note text,
  status text not null default 'not_contacted'
    check (status in ('not_contacted', 'contacted', 'interested', 'declined', 'joined')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outreach_leads_status_idx on public.outreach_leads (status);

alter table public.outreach_leads enable row level security;

create policy "Admins manage outreach leads"
  on public.outreach_leads for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- neighborhood leaderboard — completed-order counts per seller over the
-- last 30 days, so the client can rank "top kitchens" within one
-- neighborhood without a heavier aggregate query on every Browse load
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

-- admin mass-message — the admin UI resolves the target audience (all /
-- sellers / buyers / one neighborhood) to a list of profile ids with a
-- normal SELECT (profiles are already publicly readable), then hands that
-- list to this function to actually write the notifications, since clients
-- have no direct INSERT policy on public.notifications
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
