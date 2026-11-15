-- BEATLINK — storage buckets and policies.
-- Paths:
--   images/{uid}/avatar-<ts>.jpg | banner-<ts>.jpg   (public, CDN-cacheable)
--   tracks/{uid}/<uuid>.<ext>                         (private, signed URLs)
--   message-audio/{conversation_id}/<uuid>.<ext>      (private, members only)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('images', 'images', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('tracks', 'tracks', false, 15 * 1024 * 1024,
    array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/webm']),
  ('message-audio', 'message-audio', false, 25 * 1024 * 1024,
    array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Safe cast of the first path segment to uuid (returns null when it is not one).
create or replace function public.path_uuid(object_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return ((storage.foldername(object_name))[1])::uuid;
exception when others then
  return null;
end $$;
grant execute on function public.path_uuid(text) to authenticated;

-- images: owner writes in their own folder; reads go through the public CDN URL.
create policy "images insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.path_uuid(name) = auth.uid());
create policy "images update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'images' and public.path_uuid(name) = auth.uid())
  with check (bucket_id = 'images' and public.path_uuid(name) = auth.uid());
create policy "images delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.path_uuid(name) = auth.uid());

-- tracks: any signed-in user can stream (signed URL) unless blocked; owner manages.
create policy "tracks read unless blocked" on storage.objects for select to authenticated
  using (bucket_id = 'tracks' and not public.is_blocked_pair(auth.uid(), public.path_uuid(name)));
create policy "tracks insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'tracks' and public.path_uuid(name) = auth.uid());
create policy "tracks delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'tracks' and public.path_uuid(name) = auth.uid());

-- message-audio: conversation members only; uploads only where the user can post.
create policy "message audio read members" on storage.objects for select to authenticated
  using (bucket_id = 'message-audio' and public.is_conversation_member(public.path_uuid(name)));
create policy "message audio insert members" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-audio' and public.can_post(public.path_uuid(name)));
