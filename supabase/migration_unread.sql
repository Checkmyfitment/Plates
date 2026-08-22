-- Adds unread-message tracking so the Messages tab can show a badge for new
-- replies. Run this once in the Supabase SQL Editor (Project > SQL Editor >
-- New query). Non-destructive: it just adds two nullable timestamp columns
-- to the existing chats table and one new update policy.
-- Do NOT re-run the full schema.sql to get this, it would wipe your data.

alter table public.chats add column if not exists buyer_last_read_at timestamptz;
alter table public.chats add column if not exists seller_last_read_at timestamptz;

drop policy if exists "Participants can update their chats" on public.chats;
create policy "Participants can update their chats"
  on public.chats for update
  using (
    auth.uid() = buyer_id
    or auth.uid() in (select seller_id from public.listings where id = listing_id)
  );
