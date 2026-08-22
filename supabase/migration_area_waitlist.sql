-- A lightweight email capture for visitors whose neighborhood doesn't have
-- any sellers yet — turns a visitor who'd otherwise just bounce into
-- someone you can follow up with once your area fills in. Works for guests
-- too (no account needed to join). Standalone and safe to run.

create table if not exists public.area_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  neighborhood text,
  created_at timestamptz not null default now(),
  unique (email)
);

alter table public.area_waitlist enable row level security;

-- no direct table-level insert/select policy for anon/authenticated on
-- purpose — everything goes through the function below instead, which
-- runs as its owner (bypassing RLS internally) and only needs an EXECUTE
-- grant. This sidesteps some deep, unresolved inconsistency between this
-- project's anon-role table grants/RLS and what the actual API was
-- enforcing for a direct anonymous table write — the function-based
-- approach is also just the more standard, safer pattern for this kind of
-- public write in Supabase generally.
drop policy if exists "Anyone can join the waitlist" on public.area_waitlist;
drop policy if exists "Anyone can update their waitlist entry" on public.area_waitlist;
revoke insert, update on public.area_waitlist from anon, authenticated;

drop policy if exists "Admins can view the waitlist" on public.area_waitlist;
create policy "Admins can view the waitlist"
  on public.area_waitlist for select
  using (public.is_admin(auth.uid()));

create or replace function public.join_area_waitlist(p_email text, p_neighborhood text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Email is required.';
  end if;

  insert into public.area_waitlist (email, neighborhood)
  values (lower(trim(p_email)), nullif(trim(coalesce(p_neighborhood, '')), ''))
  on conflict (email) do update set neighborhood = excluded.neighborhood;
end;
$$;

grant execute on function public.join_area_waitlist(text, text) to anon, authenticated;
