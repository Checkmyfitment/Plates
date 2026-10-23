-- Real payments for the seller "Plates Pro" tier (monthly subscription).
-- Until now Pro was only an admin toggle (migration_monetization.sql) with
-- billing arranged by hand. This adds the paid side: Stripe (web) and
-- RevenueCat (iOS/Android in-app subscriptions) both land in one shared,
-- idempotent path, exactly like apply_listing_boost does for Featured
-- listings (migration_listing_boost_payments.sql).
--
-- Nothing here changes behavior until the matching Edge Functions are
-- deployed and PRO_PAYMENTS_LIVE is switched on in src/lib/siteInfo.js.
-- An admin-granted Pro (is_pro = true, pro_until null) is left alone by
-- every function below -- only subscription-derived Pro ever expires.
--
-- Standalone and safe to run -- does not touch or delete existing data.

alter table public.profiles add column if not exists pro_until timestamptz;

-- like is_pro/pro_since, pro_until must never be self-grantable
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
      new.pro_until := null;
    else
      new.is_admin := old.is_admin;
      new.banned := old.banned;
      new.is_pro := old.is_pro;
      new.pro_since := old.pro_since;
      new.pro_until := old.pro_until;
    end if;
  end if;
  return new;
end;
$$;

-- One row per subscription, keyed by the provider's own subscription id
-- (Stripe subscription id / the store's original transaction id via
-- RevenueCat) so a redelivered webhook just updates the same row.
create table if not exists public.pro_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('revenuecat', 'stripe')),
  provider_subscription_id text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  -- active/trialing/past_due keep access until current_period_end;
  -- canceled = auto-renew turned off but still paid through the period;
  -- expired = over, no access
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pro_subscriptions_provider_sub_unique
  on public.pro_subscriptions (provider, provider_subscription_id);
create index if not exists pro_subscriptions_user_id_idx on public.pro_subscriptions (user_id);

alter table public.pro_subscriptions enable row level security;

-- people can see their own subscription (e.g. a "manage subscription"
-- section); nothing is client-writable -- only apply_pro_subscription()
-- (service role, from the verified webhooks) ever writes
drop policy if exists "Users can view their own pro subscriptions" on public.pro_subscriptions;
create policy "Users can view their own pro subscriptions"
  on public.pro_subscriptions for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Records the latest state of one subscription, then recomputes whether
-- the user currently has Pro and until when (the latest paid-through date
-- across all their subscriptions that still grant access).
--
-- security definer + revoked from authenticated/anon: only ever called with
-- the service-role key from stripe-webhook / revenuecat-webhook, after each
-- has verified the event is genuine. A client calling this directly could
-- grant itself Pro for free.
create or replace function public.apply_pro_subscription(
  p_user_id uuid,
  p_provider text,
  p_provider_subscription_id text,
  p_platform text,
  p_status text,
  p_period_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until timestamptz;
begin
  insert into public.pro_subscriptions
    (user_id, provider, provider_subscription_id, platform, status, current_period_end)
  values
    (p_user_id, p_provider, p_provider_subscription_id, p_platform, p_status, p_period_end)
  on conflict (provider, provider_subscription_id) do update
    set status = excluded.status,
        current_period_end = excluded.current_period_end,
        updated_at = now();

  select max(current_period_end) into v_until
  from public.pro_subscriptions
  where user_id = p_user_id
    and status in ('active', 'trialing', 'past_due', 'canceled')
    and current_period_end is not null
    and current_period_end > now();

  if v_until is not null then
    update public.profiles
    set is_pro = true,
        pro_until = v_until,
        pro_since = coalesce(pro_since, now())
    where id = p_user_id;
  else
    -- only revoke subscription-derived Pro (pro_until set); an admin-granted
    -- Pro has pro_until null and is never touched here
    update public.profiles
    set is_pro = false, pro_until = null, pro_since = null
    where id = p_user_id and pro_until is not null;
  end if;
end;
$$;

revoke all on function public.apply_pro_subscription(uuid, text, text, text, text, timestamptz) from public, authenticated, anon;
grant execute on function public.apply_pro_subscription(uuid, text, text, text, text, timestamptz) to service_role;

-- safety net for a missed "expired" webhook: hourly, drop subscription-
-- derived Pro that's past its paid-through date
create or replace function public.expire_pro_subscriptions()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set is_pro = false, pro_until = null, pro_since = null
  where pro_until is not null and pro_until < now();
$$;

create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-pro-subscriptions';
select cron.schedule('expire-pro-subscriptions', '5 * * * *', 'select public.expire_pro_subscriptions();');
