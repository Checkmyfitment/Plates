-- A lightweight audit log of admin actions -- who banned/promoted/deleted
-- what, and when. There was previously zero record of this. admin_id
-- defaults to auth.uid() (never passed by the client) and the insert
-- policy pins it to the actual caller, so it can't be spoofed. Kept even
-- if the admin's own account is later deleted (on delete set null) so the
-- history isn't lost.

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null default auth.uid(),
  action text not null,
  target_type text not null,
  target_id uuid,
  detail text check (detail is null or char_length(detail) <= 300),
  created_at timestamptz not null default now()
);

create index admin_actions_created_at_idx on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;

create policy "Admins can view admin actions"
  on public.admin_actions for select
  using (public.is_admin(auth.uid()));

create policy "Admins can insert admin actions"
  on public.admin_actions for insert
  with check (public.is_admin(auth.uid()) and admin_id = auth.uid());
