-- Closes 5 gaps found in a full backend audit. All are hardening fixes to
-- things already shipped — none of them change normal app behavior.
-- Standalone and safe to run — does not touch or delete existing data.

-- 1 & 2: protect_profile_admin_fields / protect_listing_admin_fields only
-- ran on UPDATE, so a user could set is_admin/banned/featured on the very
-- first INSERT of their own row (bypassing the trigger entirely, since
-- normally the row already exists by the time they could UPDATE it).
-- Extend both triggers to also run on INSERT. OLD doesn't exist on INSERT,
-- so branch on TG_OP instead of referencing old.* in that case.
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
    else
      new.is_admin := old.is_admin;
      new.banned := old.banned;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields_trigger on public.profiles;
create trigger protect_profile_admin_fields_trigger
  before insert or update on public.profiles
  for each row execute function public.protect_profile_admin_fields();

create or replace function public.protect_listing_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    if TG_OP = 'INSERT' then
      new.featured := false;
    else
      new.featured := old.featured;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_listing_admin_fields_trigger on public.listings;
create trigger protect_listing_admin_fields_trigger
  before insert or update on public.listings
  for each row execute function public.protect_listing_admin_fields();

-- 3: claim_store didn't check for a banned caller — a banned account could
-- still claim a store and take over every listing under it.
create or replace function public.claim_store(p_claim_code text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.unclaimed_stores%rowtype;
begin
  if public.is_banned(auth.uid()) then
    raise exception 'Your account is suspended and can''t claim a store.';
  end if;

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

-- 4: the reviews UPDATE policy only reused its USING clause as the check,
-- so an existing review could be edited to set reviewer_id = seller_id
-- (self-review) even though INSERT explicitly forbids that.
drop policy if exists "Users can update their own reviews" on public.reviews;
create policy "Users can update their own reviews"
  on public.reviews for update
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id and reviewer_id <> seller_id);

-- 5: unclaimed_stores.created_by cascaded on delete, so removing the admin
-- account that created a store would delete the store row entirely — even
-- an already-claimed one — destroying the record and silently detaching
-- any listings still pointing at it. Match claimed_by's on-delete-set-null
-- behavior instead.
alter table public.unclaimed_stores alter column created_by drop not null;
alter table public.unclaimed_stores drop constraint if exists unclaimed_stores_created_by_fkey;
alter table public.unclaimed_stores add constraint unclaimed_stores_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;
