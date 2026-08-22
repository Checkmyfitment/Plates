-- Adds separate taste/portion/value dimension scores to reviews, instead of
-- just one overall star rating (existing `rating` column is kept as-is and
-- is now computed client-side as the rounded average of the three dimensions,
-- so the existing seller_ratings view and badge logic keep working unchanged).
-- Standalone and safe to re-run — existing reviews just get null dimension
-- scores until their author edits their review.

alter table public.reviews
  add column if not exists taste_rating smallint check (taste_rating between 1 and 5);

alter table public.reviews
  add column if not exists portion_rating smallint check (portion_rating between 1 and 5);

alter table public.reviews
  add column if not exists value_rating smallint check (value_rating between 1 and 5);

-- rebuild seller_ratings to also expose per-dimension averages
drop view if exists public.seller_ratings;

create view public.seller_ratings as
  select
    seller_id,
    round(avg(rating)::numeric, 1) as avg_rating,
    count(*) as review_count,
    round(avg(taste_rating)::numeric, 1) as avg_taste,
    round(avg(portion_rating)::numeric, 1) as avg_portion,
    round(avg(value_rating)::numeric, 1) as avg_value
  from public.reviews
  group by seller_id;
