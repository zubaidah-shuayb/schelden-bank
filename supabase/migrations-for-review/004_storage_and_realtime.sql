-- ============================================================================
-- Schelden Bank — 004_storage_and_realtime.sql   (HARDENED REVISION)
-- Storage buckets, storage access rules, and realtime for Live Support.
-- Run AFTER 003.
--
-- CHANGES IN THIS REVISION
--  * The realtime section is now fully re-runnable: each table is added to the
--    publication only when it is not already a member, so running this file a
--    second time no longer fails with a duplicate-object error.
--
-- NOTE: buckets are created here with the storage API's own table, which is
-- allowed in your project's SQL Editor. If your project blocks bucket inserts,
-- create the two buckets in Dashboard → Storage instead, then run only the
-- policy section below.
--   1. "avatars"           — private, profile pictures
--   2. "support-attachments" — private, images and PDFs in Live Support
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880,
   array['image/png','image/jpeg','image/webp']),
  ('support-attachments', 'support-attachments', false, 10485760,
   array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------- avatars --
-- Files are stored as: avatars/<auth-user-uuid>/<filename>
drop policy if exists avatars_read_own on storage.objects;
create policy avatars_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists avatars_write_own on storage.objects;
create policy avatars_write_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------- support attachments --
-- Files are stored as: support-attachments/<conversation-uuid>/<filename>
drop policy if exists support_files_read on storage.objects;
create policy support_files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      public.is_admin()
      or exists (
        select 1 from public.support_conversations c
        where c.id::text = (storage.foldername(name))[1]
          and c.user_id = auth.uid()
      )
    )
  );

drop policy if exists support_files_write on storage.objects;
create policy support_files_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (
      public.is_admin()
      or exists (
        select 1 from public.support_conversations c
        where c.id::text = (storage.foldername(name))[1]
          and c.user_id = auth.uid()
      )
    )
  );

drop policy if exists support_files_delete on storage.objects;
create policy support_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      public.is_admin()
      or exists (
        select 1 from public.support_conversations c
        where c.id::text = (storage.foldername(name))[1]
          and c.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------- realtime --
-- Enables instant message delivery, typing indicators and read receipts.
-- Idempotent: adding a table twice is skipped instead of raising an error.
do $$
declare
  _t text;
begin
  foreach _t in array array[
    'support_messages',
    'support_conversations',
    'notifications',
    'accounts',
    'transactions'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = _t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', _t);
    end if;
  end loop;
end $$;

alter table public.support_messages replica identity full;
alter table public.support_conversations replica identity full;
