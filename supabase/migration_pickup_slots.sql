-- Reserve-ahead pickup windows: sellers publish specific pickup time slots
-- (optionally capacity-limited) for a listing, and buyers can RSVP ("I'm
-- coming") to a slot instead of just messaging and hoping for the best.
-- Standalone and safe to re-run — none of this touches existing data; a
-- listing with zero slots just behaves exactly as it does today.

create table if not exists public.pickup_slots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int,
  created_at timestamptz not null default now()
);

alter table public.pickup_slots enable row level security;

drop policy if exists "Pickup slots are viewable by everyone" on public.pickup_slots;
create policy "Pickup slots are viewable by everyone"
  on public.pickup_slots for select
  using (true);

drop policy if exists "Sellers manage slots on their own listings" on public.pickup_slots;
create policy "Sellers manage slots on their own listings"
  on public.pickup_slots for all
  using (auth.uid() in (select seller_id from public.listings where id = listing_id))
  with check (auth.uid() in (select seller_id from public.listings where id = listing_id));

create table if not exists public.pickup_reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.pickup_slots(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (slot_id, buyer_id)
);

alter table public.pickup_reservations enable row level security;

drop policy if exists "Buyers manage their own reservations" on public.pickup_reservations;
create policy "Buyers manage their own reservations"
  on public.pickup_reservations for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

drop policy if exists "Sellers can view reservations on their own slots" on public.pickup_reservations;
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
drop view if exists public.pickup_slot_counts;
create view public.pickup_slot_counts as
  select slot_id, count(*) as reserved_count
  from public.pickup_reservations
  group by slot_id;
