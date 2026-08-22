-- Recurring weekly "cook schedule" for pre-order/batch-cooking listings —
-- e.g. "tamales every Tuesday and Friday" — distinct from pickup_slots
-- (one-off specific date/time windows for food that's already made).
-- A listing_schedules row is a standing weekly pattern; buyers pre-order
-- into a specific upcoming calendar date computed from that pattern, which
-- is what schedule_reservations.occurrence_date tracks.
-- Standalone and safe to run — does not touch or delete existing data.

create table if not exists public.listing_schedules (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday .. 6 = Saturday
  pickup_start time not null,
  pickup_end time not null,
  capacity int,
  created_at timestamptz not null default now()
);

alter table public.listing_schedules enable row level security;

drop policy if exists "Listing schedules are viewable by everyone" on public.listing_schedules;
create policy "Listing schedules are viewable by everyone"
  on public.listing_schedules for select
  using (true);

drop policy if exists "Sellers manage schedules on their own listings" on public.listing_schedules;
create policy "Sellers manage schedules on their own listings"
  on public.listing_schedules for all
  using (auth.uid() in (select seller_id from public.listings where id = listing_id))
  with check (auth.uid() in (select seller_id from public.listings where id = listing_id));

-- a buyer's pre-order into one specific upcoming occurrence of a schedule
-- (occurrence_date is a real calendar date, e.g. 2026-08-04, computed
-- client-side from the weekday pattern — not stored anywhere else)
create table if not exists public.schedule_reservations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.listing_schedules(id) on delete cascade,
  occurrence_date date not null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (schedule_id, occurrence_date, buyer_id)
);

alter table public.schedule_reservations enable row level security;

drop policy if exists "Buyers manage their own schedule reservations" on public.schedule_reservations;
create policy "Buyers manage their own schedule reservations"
  on public.schedule_reservations for all
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id and not public.is_banned(auth.uid()));

drop policy if exists "Sellers can view reservations on their own schedules" on public.schedule_reservations;
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

-- public headcount per (schedule, occurrence date), so buyers can see
-- "12/40 reserved" without needing select access to everyone else's rows
drop view if exists public.schedule_reservation_counts;
create view public.schedule_reservation_counts as
  select schedule_id, occurrence_date, count(*) as reserved_count
  from public.schedule_reservations
  group by schedule_id, occurrence_date;
