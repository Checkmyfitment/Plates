-- "New listing near you" alerts, in-app only (no push notifications yet —
-- see CHECKLIST.md). Buyers follow a cuisine; when a new listing in that
-- cuisine is posted, everyone following it gets an in-app notification.
-- Standalone and safe to re-run — none of this touches existing data.

create table if not exists public.listing_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cuisine text not null,
  created_at timestamptz not null default now(),
  unique (user_id, cuisine)
);

alter table public.listing_alerts enable row level security;

drop policy if exists "Users manage their own listing alerts" on public.listing_alerts;
create policy "Users manage their own listing alerts"
  on public.listing_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- whenever a new listing is posted, notify every buyer following that cuisine
create or replace function public.handle_new_listing_alert_matches()
returns trigger as $$
begin
  insert into public.notifications (user_id, listing_id, message)
  select la.user_id, new.id, 'New ' || new.cuisine || ' listing near you: "' || new.title || '"'
  from public.listing_alerts la
  where la.cuisine = new.cuisine
    and la.user_id <> new.seller_id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_listing_created_notify on public.listings;
create trigger on_listing_created_notify
  after insert on public.listings
  for each row execute procedure public.handle_new_listing_alert_matches();
