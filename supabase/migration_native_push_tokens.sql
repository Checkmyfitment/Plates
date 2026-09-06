-- Stores each device's native push token (real APNs/FCM, via
-- @capacitor/push-notifications) separately from public.push_subscriptions
-- (browser Web Push — endpoint/p256dh/auth). A native device registers one
-- row here instead: platform + a single opaque token string. Standalone and
-- safe to run — does not touch or delete existing data.

create table if not exists public.native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  token text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists native_push_tokens_user_id_idx on public.native_push_tokens (user_id);

alter table public.native_push_tokens enable row level security;

drop policy if exists "Users manage their own native push tokens" on public.native_push_tokens;
create policy "Users manage their own native push tokens"
  on public.native_push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
