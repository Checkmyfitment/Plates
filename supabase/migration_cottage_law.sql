-- Seller-side confirmation that they're legally permitted to sell homemade
-- food under their state/local cottage food laws. Not a legal opinion or a
-- guarantee of compliance -- just an affirmative claim from the seller,
-- same pattern as allergens_confirmed in migration_feature_batch.sql.
-- Standalone and safe to run -- does not touch or delete existing data.

alter table public.listings
  add column cottage_law_confirmed boolean not null default false;
