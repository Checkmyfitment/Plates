-- Unclaimed stores get real map coordinates, geocoded from the admin-typed
-- neighborhood text (same geocodeArea() flow a seller's own profile already
-- uses), so they can finally show a pin on the map and a "Nearest" distance
-- instead of just a text label with nothing plottable. Standalone and safe
-- to run -- does not touch or delete existing data (existing stores just
-- have null lat/lng until an admin re-saves them).

alter table public.unclaimed_stores
  add column lat double precision,
  add column lng double precision;

create or replace view public.unclaimed_store_public as
  select id, name, kitchen, neighborhood, contact_note, lat, lng
  from public.unclaimed_stores;
