-- A single computed "is this seller reliable" signal, in the spirit of
-- Etsy's Star Seller badge — pulls together data Plates already tracks
-- (order completion, no-shows, ratings) that was previously only shown as
-- separate numbers, never combined into one trust signal a buyer can
-- recognize at a glance.
create or replace view public.seller_trust_stats as
with order_stats as (
  select
    seller_id,
    count(*) filter (where status = 'completed') as completed_count,
    count(*) filter (where status = 'no_show') as no_show_count,
    count(*) filter (where status in ('completed', 'cancelled', 'no_show')) as terminal_count
  from public.orders
  group by seller_id
)
select
  p.id as seller_id,
  coalesce(os.completed_count, 0) as completed_count,
  coalesce(os.no_show_count, 0) as no_show_count,
  case
    when coalesce(os.terminal_count, 0) = 0 then null
    else round(100.0 * os.completed_count / os.terminal_count)
  end as completion_rate,
  sr.avg_rating,
  sr.review_count,
  (
    coalesce(os.completed_count, 0) >= 5
    and coalesce(os.terminal_count, 0) > 0
    and (100.0 * os.completed_count / os.terminal_count) >= 90
    and coalesce(sr.avg_rating, 0) >= 4.5
    and coalesce(sr.review_count, 0) >= 3
    and coalesce(os.no_show_count, 0) = 0
  ) as is_top_rated
from public.profiles p
left join order_stats os on os.seller_id = p.id
left join public.seller_ratings sr on sr.seller_id = p.id;

grant select on public.seller_trust_stats to authenticated, anon;
