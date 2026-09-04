-- Two monetization pieces, both billed manually for now (no Stripe yet):
-- 1. Fixes a real gap in the existing $5/week Featured listing flow --
--    `featured` was a permanent boolean with no expiry, so a seller who
--    paid for one week would stay featured forever unless an admin
--    remembered to manually un-feature them.
-- 2. Adds a seller "Pro" tier -- same manual-billing pattern Featured
--    already used ("billed manually for now"), an admin toggle, and a
--    badge on the seller's storefront/profile.

alter table public.listings add column featured_until timestamptz;

alter table public.profiles add column is_pro boolean not null default false;
alter table public.profiles add column pro_since timestamptz;

-- is_pro/pro_since must never be self-grantable -- same protection this
-- trigger already gives is_admin/banned
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if TG_OP = 'INSERT' then
      new.is_admin := false;
      new.banned := false;
      new.is_pro := false;
      new.pro_since := null;
    else
      new.is_admin := old.is_admin;
      new.banned := old.banned;
      new.is_pro := old.is_pro;
      new.pro_since := old.pro_since;
    end if;
  end if;
  return new;
end;
$$;

-- runs hourly: un-features anything past its paid week, so a seller who
-- doesn't renew doesn't stay featured for free indefinitely. Only ever
-- touches listings with featured_until set -- an admin's own manual
-- "feature this listing" toggle (no expiry) is left alone on purpose.
create function public.expire_featured_listings()
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
  set featured = false, featured_until = null
  where featured = true and featured_until is not null and featured_until < now();
$$;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-featured-listings';
select cron.schedule('expire-featured-listings', '0 * * * *', 'select public.expire_featured_listings();');

-- admin_list_users(): add is_pro so the admin Users panel can show/toggle
-- it (return-type change, so this one needs a drop first)
drop function if exists public.admin_list_users(text);

create function public.admin_list_users(q text default null)
returns table(id uuid, name text, email text, is_admin boolean, banned boolean, is_pro boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select p.id, p.name, u.email::text, p.is_admin, p.banned, p.is_pro, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where q is null or q = '' or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%'
    order by p.created_at desc
    limit 50;
end;
$$;

grant execute on function public.admin_list_users(text) to authenticated;
