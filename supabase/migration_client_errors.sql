-- Client-side error logging. Right now an unhandled error just goes to
-- console.error, which is fine in dev but means nobody finds out a real
-- user hit a bug once this is actually deployed. Anyone (including a
-- logged-out guest) can insert -- errors happen before login too -- but
-- only admins can read them back. Standalone and safe to run.

create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  message text not null check (char_length(message) <= 2000),
  stack text check (stack is null or char_length(stack) <= 4000),
  context text check (context is null or char_length(context) <= 100),
  path text check (path is null or char_length(path) <= 300),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index client_errors_created_at_idx on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

create policy "Anyone can log a client error"
  on public.client_errors for insert
  with check (true);

create policy "Admins can view client errors"
  on public.client_errors for select
  using (public.is_admin(auth.uid()));

create policy "Admins can delete client errors"
  on public.client_errors for delete
  using (public.is_admin(auth.uid()));
