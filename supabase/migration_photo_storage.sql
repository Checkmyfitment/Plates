-- Moves listing/avatar photos off base64-in-the-database and into real
-- Supabase Storage buckets. Existing base64 photo_url/avatar_url values
-- keep working (they're still valid <img src> data), this only changes
-- where NEW uploads go.
-- Standalone and safe to run — does not touch or delete existing data.

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- public read on both buckets — listing photos and avatars are shown to
-- every browsing user, same as the listings/profiles tables themselves
drop policy if exists "listing-photos public read" on storage.objects;
create policy "listing-photos public read"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- uploads/edits/deletes are scoped to a folder named after the uploader's
-- own user id (path convention: {user_id}/{filename}), and blocked for
-- banned accounts on the write side, same as listings/chats/messages/reviews
drop policy if exists "listing-photos owner insert" on storage.objects;
create policy "listing-photos owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_banned(auth.uid())
  );

drop policy if exists "listing-photos owner update" on storage.objects;
create policy "listing-photos owner update"
  on storage.objects for update
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "listing-photos owner delete" on storage.objects;
create policy "listing-photos owner delete"
  on storage.objects for delete
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_banned(auth.uid())
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
