-- Lets a buyer follow a specific seller ("kitchen"), separate from
-- following a cuisine or an area. Extends the existing new-listing trigger
-- to notify followers too, picking exactly one notification per user even
-- if they'd match more than one way (follow + cuisine + area) — a direct
-- seller-follow takes priority over a cuisine match, which takes priority
-- over an area match, since it's the most specific signal.
-- Standalone and safe to run — does not touch or delete existing data.

create table if not exists public.seller_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, seller_id)
);

alter table public.seller_follows enable row level security;

drop policy if exists "Seller follows are viewable by everyone" on public.seller_follows;
create policy "Seller follows are viewable by everyone"
  on public.seller_follows for select
  using (true);

drop policy if exists "Users manage their own seller follows" on public.seller_follows;
create policy "Users manage their own seller follows"
  on public.seller_follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id and follower_id <> seller_id and not public.is_banned(auth.uid()));

create or replace function public.handle_new_listing_alert_matches()
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
