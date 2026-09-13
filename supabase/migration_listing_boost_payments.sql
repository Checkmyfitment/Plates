-- Wires a real payment to the "Featured listing" flow that
-- migration_promotions.sql and migration_monetization.sql already built.
-- Until now, "Request to be featured" just messaged an admin who
-- manually arranged payment off-platform and flipped `featured` by hand.
-- This adds the payment side: RevenueCat (iOS/Android IAP) and Stripe
-- (web) webhooks both land here, through one shared, idempotent path.
--
-- Standalone and safe to run — does not touch or delete existing data.

-- One row per successful payment, keyed by the payment provider's own
-- transaction id so a retried/duplicate webhook delivery (both RevenueCat
-- and Stripe explicitly warn webhooks can be delivered more than once)
-- can't double-apply -- the unique index on (provider, provider_transaction_id)
-- is what makes apply_listing_boost() below safe to call twice with the
-- same transaction.
create table public.listing_boosts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('revenuecat', 'stripe')),
  provider_transaction_id text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  days integer not null default 7 check (days > 0),
  created_at timestamptz not null default now()
);

create unique index listing_boosts_provider_txn_unique
  on public.listing_boosts (provider, provider_transaction_id);

create index listing_boosts_listing_id_idx on public.listing_boosts (listing_id);
create index listing_boosts_seller_id_idx on public.listing_boosts (seller_id);

alter table public.listing_boosts enable row level security;

-- sellers can see their own purchase history (e.g. a "past boosts" list
-- on their dashboard); nobody else can, and nothing here is writable by
-- a client directly -- only apply_listing_boost() (service-role only,
-- called from the webhook Edge Functions) ever inserts a row
create policy "Sellers can view their own listing boosts"
  on public.listing_boosts for select
  using (auth.uid() = seller_id or public.is_admin(auth.uid()));

-- Applies a paid boost: logs the payment (idempotently) and features the
-- listing for `days`, extending from whichever is later -- now, or the
-- listing's existing featured_until -- so a boost bought while already
-- featured adds time instead of cutting the current run short.
--
-- security definer + revoked from authenticated/anon: this must only ever
-- be called with the service-role key, from the revenuecat-webhook and
-- stripe-webhook Edge Functions, after each has independently verified
-- the payment is real (RevenueCat's Authorization-header shared secret;
-- Stripe's signed event). A client calling this directly could feature
-- any listing for free, so it is never exposed to authenticated/anon.
create function public.apply_listing_boost(
  p_listing_id uuid,
  p_seller_id uuid,
  p_provider text,
  p_provider_transaction_id text,
  p_platform text,
  p_amount_cents integer,
  p_currency text,
  p_days integer default 7
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base timestamptz;
begin
  insert into public.listing_boosts
    (listing_id, seller_id, provider, provider_transaction_id, platform, amount_cents, currency, days)
  values
    (p_listing_id, p_seller_id, p_provider, p_provider_transaction_id, p_platform, p_amount_cents, p_currency, p_days)
  on conflict (provider, provider_transaction_id) do nothing;

  -- on conflict means this exact transaction was already applied (a
  -- redelivered webhook) -- do not extend featured_until a second time
  if not found then
    return;
  end if;

  select greatest(now(), coalesce(featured_until, now())) into v_base
  from public.listings where id = p_listing_id;

  update public.listings
  set featured = true, featured_until = v_base + make_interval(days => p_days)
  where id = p_listing_id;
end;
$$;

revoke all on function public.apply_listing_boost(uuid, uuid, text, text, text, integer, text, integer) from public, authenticated, anon;
grant execute on function public.apply_listing_boost(uuid, uuid, text, text, text, integer, text, integer) to service_role;
