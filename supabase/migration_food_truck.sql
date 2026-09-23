-- Food trucks: sellers who operate out of a vehicle rather than a fixed
-- kitchen. Location isn't live/GPS-tracked -- a food truck posts today's
-- spot manually (the same way trucks actually announce themselves), so
-- this is just a labeled point + timestamp on the seller's profile, not a
-- streaming position. Weekly hours reuse the existing listing_schedules
-- table/UI as-is; no schema change needed there.
--
-- Standalone and safe to run — does not touch or delete existing data.

alter table public.profiles
  add column if not exists is_food_truck boolean not null default false,
  add column if not exists truck_location_label text check (truck_location_label is null or char_length(truck_location_label) <= 150),
  add column if not exists truck_location_lat double precision,
  add column if not exists truck_location_lng double precision,
  add column if not exists truck_location_updated_at timestamptz;
