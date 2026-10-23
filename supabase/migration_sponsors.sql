-- Sponsored placements ("ads"): a local business pays to appear as a clearly
-- labeled "Sponsored" card in Browse/Search. First-party only -- no ad
-- network, no tracking IDs, no per-user data stored -- so it doesn't change
-- the app's privacy answers on either store.
--
-- Nothing is shown until the SPONSORS_ENABLED flag in src/lib/siteInfo.js is
-- switched on AND there's at least one live row here. Manage rows from the
-- Supabase Table Editor (or the Admin panel once one is built).
--
-- Standalone and safe to run -- does not touch or delete existing data.

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  tagline text check (tagline is null or char_length(tagline) <= 140),
  image_url text,
  -- https only: this is opened from inside the app, so never allow a
  -- javascript:/data:/http: link here
  link_url text not null check (link_url ~* '^https://'),
  cta_label text not null default 'Learn more' check (char_length(cta_label) between 1 and 24),
  placement text not null default 'browse' check (placement in ('browse', 'search')),
  -- optional targeting: only show to people whose profile neighborhood
  -- matches (case-insensitive). Null = show to everyone.
  neighborhood text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  impressions integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sponsors_live_idx on public.sponsors (placement, active, starts_at, ends_at);

alter table public.sponsors enable row level security;

-- everyone (signed in or not) can read sponsors that are live right now
drop policy if exists "Anyone can view live sponsors" on public.sponsors;
create policy "Anyone can view live sponsors"
  on public.sponsors for select
  using (active and starts_at <= now() and (ends_at is null or ends_at > now()));

-- admins see and manage everything (including expired/paused rows)
drop policy if exists "Admins can view all sponsors" on public.sponsors;
create policy "Admins can view all sponsors"
  on public.sponsors for select using (public.is_admin(auth.uid()));

drop policy if exists "Admins can insert sponsors" on public.sponsors;
create policy "Admins can insert sponsors"
  on public.sponsors for insert with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can update sponsors" on public.sponsors;
create policy "Admins can update sponsors"
  on public.sponsors for update using (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete sponsors" on public.sponsors;
create policy "Admins can delete sponsors"
  on public.sponsors for delete using (public.is_admin(auth.uid()));

-- Anonymous impression/click counting. A function (not a client UPDATE) so
-- visitors can bump a counter without any write access to the table. It
-- stores nothing about who looked -- just +1 on the sponsor's own counters,
-- and only for a sponsor that's live right now. Counts can be inflated by
-- someone scripting calls, so treat them as approximate, not billing-grade.
create or replace function public.record_sponsor_event(p_sponsor_id uuid, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event = 'impression' then
    update public.sponsors set impressions = impressions + 1
    where id = p_sponsor_id and active and starts_at <= now() and (ends_at is null or ends_at > now());
  elsif p_event = 'click' then
    update public.sponsors set clicks = clicks + 1
    where id = p_sponsor_id and active and starts_at <= now() and (ends_at is null or ends_at > now());
  end if;
end;
$$;

grant execute on function public.record_sponsor_event(uuid, text) to anon, authenticated;
