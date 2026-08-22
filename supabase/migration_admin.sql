-- Adds admin/moderation support: an is_admin + banned flag on profiles,
-- helper functions, admin-only policies on reports/listings/profiles, and
-- banned-user write blocks on listings/chats/messages/reviews.
-- Standalone and safe to run — does not touch or delete existing data.
--
-- IMPORTANT: this migration cannot make anyone an admin by itself (nobody
-- is an admin yet, so nobody could grant it through the app). After running
-- this file, make your own account the first admin by running this in the
-- same SQL Editor (replace with your real login email):
--
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists banned boolean not null default false;

-- small helpers so policies below don't repeat the same subquery
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

create or replace function public.is_banned(uid uuid)
returns boolean
language sql
stable
as $$
  select coalesce((select banned from public.profiles where id = uid), false);
$$;

-- prevent a non-admin from granting themselves admin or un-banning
-- themselves through a normal profile update. Direct SQL run from the
-- Supabase dashboard (no auth.uid()) is left untouched, so the bootstrap
-- update above still works.
create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.is_admin := old.is_admin;
    new.banned := old.banned;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields_trigger on public.profiles;
create trigger protect_profile_admin_fields_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_admin_fields();

-- admins can moderate any profile (e.g. to ban someone), on top of the
-- existing "users can update their own profile" policy
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin(auth.uid()));

-- admins can see and resolve every report, not just their own
drop policy if exists "Admins can view all reports" on public.reports;
create policy "Admins can view all reports"
  on public.reports for select
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update
  using (public.is_admin(auth.uid()));

-- admins can remove or update any listing during moderation
drop policy if exists "Admins can delete any listing" on public.listings;
create policy "Admins can delete any listing"
  on public.listings for delete
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update any listing" on public.listings;
create policy "Admins can update any listing"
  on public.listings for update
  using (public.is_admin(auth.uid()));

-- banned users can't post new listings, start chats, send messages, or
-- leave reviews (their existing content and account otherwise stay intact)
drop policy if exists "Users can insert their own listings" on public.listings;
create policy "Users can insert their own listings"
  on public.listings for insert
  with check (auth.uid() = seller_id and not public.is_banned(auth.uid()));

drop policy if exists "Buyers can start chats" on public.chats;
create policy "Buyers can start chats"
  on public.chats for insert
  with check (auth.uid() = buyer_id and not public.is_banned(auth.uid()));

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and not public.is_banned(auth.uid())
    and auth.uid() in (
      select buyer_id from public.chats where id = chat_id
      union
      select seller_id from public.listings l join public.chats c on c.listing_id = l.id where c.id = chat_id
    )
  );

drop policy if exists "Users can leave reviews for other sellers" on public.reviews;
create policy "Users can leave reviews for other sellers"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id and reviewer_id <> seller_id and not public.is_banned(auth.uid()));
