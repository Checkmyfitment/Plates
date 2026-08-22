-- Lets an admin pre-seed the marketplace by posting listings on behalf of a
-- real cook they've found elsewhere (Facebook, word of mouth, etc.) who
-- isn't on Plates yet. The admin creates an "unclaimed store" and attaches
-- listings to it; buyers see the store name + a note on how to reach them
-- directly instead of an in-app "message seller" button. When the real
-- owner is ready, they sign up and use a claim link to instantly take over
-- every listing posted under that store — no data re-entry needed.
-- Standalone and safe to run — does not touch or delete existing data.

create table if not exists public.unclaimed_stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kitchen text,
  neighborhood text,
  contact_note text,
  claim_code text not null unique default gen_random_uuid()::text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.unclaimed_stores enable row level security;

-- deliberately admin-only — claim_code lives on this table, and anyone who
-- can read it could claim someone else's store before the real owner does.
-- Buyer-facing listing/store info is exposed separately below, through a
-- view that leaves claim_code out entirely.
drop policy if exists "Unclaimed stores are viewable by everyone" on public.unclaimed_stores;
drop policy if exists "Admins manage unclaimed stores" on public.unclaimed_stores;
create policy "Admins manage unclaimed stores"
  on public.unclaimed_stores for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- buyer-safe subset (no claim_code, no created_by/claimed_by) — views run
-- with the owner's privileges, so this is selectable by anyone even though
-- the underlying table is admin-only, same pattern as pickup_slot_counts
drop view if exists public.unclaimed_store_public;
create view public.unclaimed_store_public as
  select id, name, kitchen, neighborhood, contact_note
  from public.unclaimed_stores;

alter table public.listings add column if not exists unclaimed_store_id uuid references public.unclaimed_stores(id) on delete set null;

-- lets any signed-in user claim a store by its (unguessable, uuid) claim
-- code: transfers every listing posted under that store to their own
-- account and fills in their kitchen/neighborhood if they haven't set one
create or replace function public.claim_store(p_claim_code text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.unclaimed_stores%rowtype;
begin
  select * into v_store from public.unclaimed_stores s where s.claim_code = p_claim_code;

  if v_store.id is null then
    raise exception 'That claim link isn''t valid.';
  end if;

  if v_store.claimed_by is not null then
    raise exception 'This store has already been claimed.';
  end if;

  update public.unclaimed_stores
  set claimed_by = auth.uid(), claimed_at = now()
  where unclaimed_stores.id = v_store.id;

  update public.listings
  set seller_id = auth.uid(), unclaimed_store_id = null
  where listings.unclaimed_store_id = v_store.id;

  update public.profiles
  set kitchen = coalesce(profiles.kitchen, v_store.kitchen),
      neighborhood = coalesce(profiles.neighborhood, v_store.neighborhood)
  where profiles.id = auth.uid();

  return query select v_store.id, v_store.name;
end;
$$;

grant execute on function public.claim_store(text) to authenticated;
