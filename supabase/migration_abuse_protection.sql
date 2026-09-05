-- Basic pre-launch abuse protection: a listing-creation rate limit so a
-- single compromised or spam account can't flood the platform. Admins are
-- exempt (bulk outreach/onboarding imports post multiple unclaimed-store
-- listings at once, all under the admin's own seller_id per the existing
-- RLS insert policy).

create function public.check_listing_rate_limit()
returns trigger as $$
declare
  v_recent_count integer;
begin
  if public.is_admin(new.seller_id) then
    return new;
  end if;

  select count(*) into v_recent_count
  from public.listings
  where seller_id = new.seller_id
    and created_at > now() - interval '24 hours';

  if v_recent_count >= 20 then
    raise exception 'You''ve posted a lot of listings today — please wait a bit before posting more, or contact us if you''re a high-volume seller.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger check_listing_rate_limit_trigger
  before insert on public.listings
  for each row execute function public.check_listing_rate_limit();
