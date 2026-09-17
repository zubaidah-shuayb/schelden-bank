-- ============================================================================
-- Schelden Bank — 006_documents_storage.sql
-- Incremental. Assumes 001–005 are already applied. Safe to run once, and
-- safe to re-run (all statements are idempotent).
--
-- WHY THIS MIGRATION EXISTS
-- Phase 3 adds the customer Documents & Statements area. public.documents
-- already exists (001) with a storage_path column, but no storage bucket was
-- created for the files themselves. This adds a PRIVATE "documents" bucket
-- with folder-based access: a customer may only read files stored under a
-- folder named with their own auth user id, e.g.
--     documents/<user_id>/2026-statement-current-Q1.pdf
--
-- NO schema changes to existing tables. NO demo/seed data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Private bucket
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Access rules
--  * Customers: READ ONLY, and only inside their own user-id folder.
--  * Customers may never upload, overwrite or delete a bank document.
--  * Administrators (public.is_admin, created in 003) have full control so the
--    admin command centre can issue statements later.
-- ----------------------------------------------------------------------------
drop policy if exists documents_read_own on storage.objects;
create policy documents_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists documents_admin_read on storage.objects;
create policy documents_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and public.is_admin());

drop policy if exists documents_admin_insert on storage.objects;
create policy documents_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.is_admin());

drop policy if exists documents_admin_update on storage.objects;
create policy documents_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and public.is_admin())
  with check (bucket_id = 'documents' and public.is_admin());

drop policy if exists documents_admin_delete on storage.objects;
create policy documents_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());

-- ============================================================================
-- End of 006
-- ============================================================================
