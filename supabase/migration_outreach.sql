-- A lightweight tracker for manual seller-recruiting outreach — you find a
-- home cook selling food on Facebook Marketplace/Nextdoor/Craigslist/etc.,
-- message them yourself from your own account, and log it here so you're
-- not losing track across dozens of manual DMs. Nothing here sends
-- anything automatically. Admin-only. Standalone and safe to run.

create table if not exists public.outreach_leads (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'other'
    check (platform in ('facebook_marketplace', 'craigslist', 'nextdoor', 'instagram', 'other')),
  contact_name text not null,
  contact_info text,
  listing_note text,
  status text not null default 'not_contacted'
    check (status in ('not_contacted', 'contacted', 'interested', 'declined', 'joined')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_leads_status_idx on public.outreach_leads (status);

alter table public.outreach_leads enable row level security;

drop policy if exists "Admins manage outreach leads" on public.outreach_leads;
create policy "Admins manage outreach leads"
  on public.outreach_leads for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
