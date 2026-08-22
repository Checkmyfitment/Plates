-- Turns on Supabase Realtime (live updates without a manual reload) for
-- three tables: messages (live chat), notifications (live bell badge),
-- and orders (live order status on My Orders / Seller Dashboard).
-- Existing row-level security policies already scope who can see what —
-- Realtime respects those same policies, so this doesn't expose anything
-- new, it just pushes the same rows a user could already fetch. Safe and
-- idempotent — checks first so it doesn't error if already enabled.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
