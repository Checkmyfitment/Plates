-- A free-text bio (separate from the short "Kitchen or shop name" tagline
-- that already existed) plus one optional social media / website link,
-- both shown on a seller's public storefront and on their own Profile
-- screen. Standalone and safe to run -- does not touch or delete existing
-- data; both columns are null for every existing account.

alter table public.profiles
  add column bio text check (bio is null or char_length(bio) <= 500),
  add column social_link text check (social_link is null or char_length(social_link) <= 200);
