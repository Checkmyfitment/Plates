-- Lets buyers/sellers attach a photo to a chat message (e.g. showing a
-- damaged item, confirming a pickup spot). A message can now carry a photo
-- with no text, so `text` becomes nullable, guarded by a check that at
-- least one of text/photo_url is present.

alter table public.messages alter column text drop not null;
alter table public.messages add column if not exists photo_url text;

alter table public.messages drop constraint if exists messages_text_or_photo_check;
alter table public.messages add constraint messages_text_or_photo_check
  check (text is not null or photo_url is not null);

insert into storage.buckets (id, name, public)
values ('chat-photos', 'chat-photos', true)
on conflict (id) do nothing;

-- public read — same convention as listing-photos/avatars; anyone with the
-- link can view, but only chat participants ever see the link itself
drop policy if exists "chat-photos public read" on storage.objects;
create policy "chat-photos public read"
  on storage.objects for select
  using (bucket_id = 'chat-photos');

drop policy if exists "chat-photos owner insert" on storage.objects;
create policy "chat-photos owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_banned(auth.uid())
  );

drop policy if exists "chat-photos owner update" on storage.objects;
create policy "chat-photos owner update"
  on storage.objects for update
  using (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat-photos owner delete" on storage.objects;
create policy "chat-photos owner delete"
  on storage.objects for delete
  using (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = auth.uid()::text);
