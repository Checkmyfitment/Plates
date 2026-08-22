-- Adds approximate kitchen location to profiles, for the "nearby kitchens" map.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- This is a small, standalone addition — it does NOT touch your existing
-- tables or rows, it just adds three new (nullable) columns to profiles.
-- Do NOT re-run the full schema.sql to get this, it would wipe your data.

alter table public.profiles add column if not exists neighborhood text;
alter table public.profiles add column if not exists lat double precision;
alter table public.profiles add column if not exists lng double precision;
