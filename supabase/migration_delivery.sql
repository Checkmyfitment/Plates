-- Adds an optional delivery option to listings (vs. pickup-only).
-- Standalone and safe to re-run: only adds columns if they don't already exist,
-- does not touch or delete any existing data.

alter table public.listings
  add column if not exists delivery_available boolean not null default false;

alter table public.listings
  add column if not exists delivery_notes text;
