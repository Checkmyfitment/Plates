-- Automated weekly "what's cooking" digest for buyers who follow a
-- seller's kitchen (public.seller_follows) -- the existing
-- broadcast_to_buyers() only fires when a seller manually chooses to
-- message their followers; this runs on its own every week and tells a
-- follower about new listings from kitchens they follow, without the
-- seller having to remember to say anything.
--
-- Reuses the exact same delivery path broadcast_to_buyers() already
-- uses: insert into public.notifications, which the existing
-- "insert on public.notifications" Database Webhook already turns into a
-- real push notification (see supabase/functions/send-push) -- nothing
-- new to wire up there.
--
-- One notification per follower per week (not one per listing), grouping
-- every kitchen they follow that posted something new in the last 7 days.
--
-- Standalone and safe to run — does not touch or delete existing data.

create or replace function public.send_weekly_kitchen_digest()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.notifications (user_id, listing_id, message)
  select
    digest.follower_id,
    null::uuid,
    case
      when digest.seller_count = 1 then
        digest.seller_names || ' posted ' || digest.listing_count || ' new dish' ||
        (case when digest.listing_count = 1 then '' else 'es' end) || ' this week — take a look?'
      else
        digest.seller_count || ' kitchens you follow posted new dishes this week: ' || digest.seller_names
    end
  from (
    select
      f.follower_id,
      count(distinct l.seller_id) as seller_count,
      count(l.id) as listing_count,
      string_agg(distinct p.name, ', ' order by p.name) as seller_names
    from public.seller_follows f
    join public.listings l on l.seller_id = f.seller_id
    join public.profiles p on p.id = l.seller_id
    where l.created_at >= now() - interval '7 days'
      and l.unclaimed_store_id is null
      and coalesce(l.available, true) = true
    group by f.follower_id
  ) digest;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'weekly-kitchen-digest';
select cron.schedule('weekly-kitchen-digest', '0 17 * * 0', 'select public.send_weekly_kitchen_digest();');
