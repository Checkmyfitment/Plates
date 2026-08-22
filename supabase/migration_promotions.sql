-- Lets a seller request that their own listing be featured, instead of
-- only an admin being able to flip it on. For now, payment happens off
-- platform (an admin manually confirms and approves) — the interface is
-- built ahead of wiring a real Stripe charge to it later.
-- Standalone and safe to run — does not touch or delete existing data.

create table if not exists public.promotion_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- only one open request per listing at a time
create unique index if not exists promotion_requests_pending_unique
  on public.promotion_requests (listing_id)
  where status = 'pending';

alter table public.promotion_requests enable row level security;

drop policy if exists "Sellers and admins can view promotion requests" on public.promotion_requests;
create policy "Sellers and admins can view promotion requests"
  on public.promotion_requests for select
  using (auth.uid() = seller_id or public.is_admin(auth.uid()));

drop policy if exists "Sellers can request a promotion for their own listing" on public.promotion_requests;
create policy "Sellers can request a promotion for their own listing"
  on public.promotion_requests for insert
  with check (
    auth.uid() = seller_id
    and not public.is_banned(auth.uid())
    and auth.uid() in (select seller_id from public.listings where id = listing_id)
  );

drop policy if exists "Admins can review promotion requests" on public.promotion_requests;
create policy "Admins can review promotion requests"
  on public.promotion_requests for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
