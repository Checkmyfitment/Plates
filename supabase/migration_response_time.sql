-- Adds a "seller_response_stats" view so buyers can see how quickly a
-- seller typically replies to messages ("Usually replies within a few
-- hours"), similar to Etsy/Depop-style response-time signals.
-- Standalone and safe to run — does not touch or delete existing data.

drop view if exists public.seller_response_stats;

create view public.seller_response_stats as
with ordered as (
  select
    m.chat_id,
    m.sender_id,
    m.created_at,
    l.seller_id,
    lag(m.sender_id) over (partition by m.chat_id order by m.created_at) as prev_sender,
    lag(m.created_at) over (partition by m.chat_id order by m.created_at) as prev_created_at
  from public.messages m
  join public.chats c on c.id = m.chat_id
  join public.listings l on l.id = c.listing_id
),
responses as (
  select
    seller_id,
    extract(epoch from (created_at - prev_created_at)) as response_seconds
  from ordered
  where sender_id = seller_id
    and prev_sender is not null
    and prev_sender <> seller_id
    -- ignore multi-day gaps (overnight/weekend silence) so the average
    -- reflects typical "awake and active" response time, not outliers
    and created_at - prev_created_at < interval '2 days'
)
select
  seller_id,
  round(avg(response_seconds) / 60.0) as avg_response_minutes,
  count(*) as response_count
from responses
group by seller_id;
