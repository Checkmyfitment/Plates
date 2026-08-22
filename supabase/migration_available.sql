-- Adds a "sold / available" flag to listings.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- This is a small, standalone addition — it does NOT touch your existing
-- tables or rows, it just adds one new column to listings, defaulted to true
-- (so every existing listing stays marked "available").
-- Do NOT re-run the full schema.sql to get this, it would wipe your data.

alter table public.listings add column if not exists available boolean not null default true;
