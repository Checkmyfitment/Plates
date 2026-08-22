-- Lets a user opt into "notify me about new listings near me" — location-
-- based, separate from the existing cuisine-follow alerts (listing_alerts).
-- Reuses the profile location already collected for the map/"Nearest" sort,
-- so there's nothing new for a user to set up beyond a single toggle.
-- Standalone and safe to run — does not touch or delete existing data.
--
-- NOTE: this file used to also (re)define handle_new_listing_alert_matches()
-- with the area-alert branch baked in. That ownership moved to
-- migration_seller_follows.sql, which layers a seller-follow branch on top
-- of this same trigger and is now the source of truth for it. Redefining
-- the function here again would silently drop that seller-follow branch if
-- this file were re-run after seller_follows.sql — so this file now only
-- adds the column the trigger depends on. If you're setting up a brand-new
-- database, run this file before migration_seller_follows.sql (or just use
-- schema.sql, which already has the combined version).

alter table public.profiles add column if not exists area_alerts_enabled boolean not null default false;
