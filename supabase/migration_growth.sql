-- Adds a handful of growth/traction features that don't need payments yet:
-- listing view counts (seller insights), admin-curated "featured" listings,
-- lightweight referral tracking, and an admin user-search RPC.
-- Standalone and safe to run — does not touch or delete existing data.

alter table public.listings add column if not exists views integer not null default 0;
alter table public.listings add column if not exists featured boolean not null default false;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;

-- capture an optional "referred_by" id (passed at signup from an invite
-- link) on top of what handle_new_user already did. Falls back to null on
-- anything malformed or pointing at a user that doesn't exist.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_referred_by uuid;
begin
  begin
    v_referred_by := nullif(new.raw_user_meta_data->>'referred_by', '')::uuid;
  exception when others then
    v_referred_by := null;
  end;

  if v_referred_by is not null and not exists (select 1 from public.profiles where id = v_referred_by) then
    v_referred_by := null;
  end if;

  insert into public.profiles (id, name, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    v_referred_by
  );
  return new;
end;
$$ language plpgsql security definer;

-- prevent a seller from marking their own (or anyone's) listing featured —
-- same pattern as protect_profile_admin_fields, added in migration_admin.sql
create or replace function public.protect_listing_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.featured := old.featured;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_listing_admin_fields_trigger on public.listings;
create trigger protect_listing_admin_fields_trigger
  before update on public.listings
  for each row execute function public.protect_listing_admin_fields();

-- anyone signed in can bump a listing's view count (it's just a counter,
-- and a plain client update would fail RLS since the viewer isn't the
-- seller), but nothing else about the row can change through this path
create or replace function public.increment_listing_views(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings set views = views + 1 where id = p_listing_id;
end;
$$;

grant execute on function public.increment_listing_views(uuid) to authenticated;

-- lets an admin search every signed-up user by name or email (email lives
-- on auth.users, which the client can't query directly) — the function
-- itself checks admin status, so it's safe to expose to any authenticated
-- caller; non-admins just get an error back
create or replace function public.admin_list_users(q text default null)
returns table(id uuid, name text, email text, is_admin boolean, banned boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select p.id, p.name, u.email, p.is_admin, p.banned, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where q is null or q = '' or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%'
    order by p.created_at desc
    limit 50;
end;
$$;

grant execute on function public.admin_list_users(text) to authenticated;
