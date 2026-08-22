-- "This week's trending kitchens": a top-20 ranked view blending recent
-- orders, favorites, and reviews (last 7 days), weighted so an actual sale
-- counts for more than a save which counts for more than nothing. A plain
-- view (not materialized) — always reflects the last 7 days as of query
-- time, no refresh job needed. Unclaimed-store listings are excluded since
-- there's no real seller account/kitchen to rank or promote.
--
-- Returns the top 20 (not just 5) with each seller's lat/lng, so the client
-- can re-rank down to a final top-5 blending in the viewer's own location
-- for "trending near you" — plain trending-by-score when they have none set.
-- Standalone and safe to run — does not touch or delete existing data.

drop view if exists public.trending_sellers;
create view public.trending_sellers as
with recent_orders as (
  select seller_id, count(*) * 3 as score
  from public.orders
  where created_at > now() - interval '7 days'
    and status not in ('cancelled', 'no_show')
  group by seller_id
),
recent_favorites as (
  select l.seller_id, count(*) * 1 as score
  from public.favorites f
  join public.listings l on l.id = f.listing_id
  where f.created_at > now() - interval '7 days'
    and l.unclaimed_store_id is null
  group by l.seller_id
),
recent_reviews as (
  select seller_id, count(*) * 2 as score
  from public.reviews
  where created_at > now() - interval '7 days'
  group by seller_id
),
combined as (
  select seller_id, score from recent_orders
  union all
  select seller_id, score from recent_favorites
  union all
  select seller_id, score from recent_reviews
),
totals as (
  select seller_id, sum(score) as trending_score
  from combined
  group by seller_id
)
select
  p.id as seller_id,
  p.name,
  p.avatar_url,
  p.kitchen,
  p.neighborhood,
  p.lat,
  p.lng,
  t.trending_score,
  row_number() over (order by t.trending_score desc) as rank
from totals t
join public.profiles p on p.id = t.seller_id
order by t.trending_score desc
limit 20;
