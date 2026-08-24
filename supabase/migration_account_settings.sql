-- Account settings: preferred translation language, and self-service
-- account deletion. Deletion anonymizes the profile rather than hard-
-- deleting the row -- orders/reviews/messages involving this person are
-- other users' records too (a seller's income history, a buyer's review),
-- and profiles.id cascades into orders on both buyer_id and seller_id, so
-- a true hard delete would silently destroy other people's transaction
-- history. Anonymizing preserves that history while removing this
-- person's name/photo/location and taking their listings down. The app
-- treats deleted_at like the existing banned flag -- signed out and
-- blocked from using that account again, same enforcement pattern.
-- Standalone and safe to run -- does not touch or delete existing data.

alter table public.profiles
  add column deleted_at timestamptz,
  add column preferred_language text;

create or replace function public.delete_my_account()
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
