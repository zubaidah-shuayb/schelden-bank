-- ============================================================================
-- Schelden Bank — 007_customer_preferences.sql
-- Incremental migration. Assumes 001–006 are already applied.
-- Run manually in the Supabase SQL Editor after review.
-- Adds customer-owned notification preferences only. No seed banking data.
-- ============================================================================

begin;

create table if not exists public.customer_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  security_email boolean not null default true,
  transaction_email boolean not null default true,
  support_email boolean not null default true,
  product_email boolean not null default false,
  push_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.customer_preferences to authenticated;
grant all on public.customer_preferences to service_role;

alter table public.customer_preferences enable row level security;

drop policy if exists customer_preferences_select_own on public.customer_preferences;
create policy customer_preferences_select_own on public.customer_preferences
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists customer_preferences_insert_own on public.customer_preferences;
create policy customer_preferences_insert_own on public.customer_preferences
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists customer_preferences_update_own on public.customer_preferences;
create policy customer_preferences_update_own on public.customer_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.customer_preferences_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists customer_preferences_guard_trg on public.customer_preferences;
create trigger customer_preferences_guard_trg
before update on public.customer_preferences
for each row execute function public.customer_preferences_guard();

revoke all on function public.customer_preferences_guard() from public, anon, authenticated;
grant execute on function public.customer_preferences_guard() to service_role;

commit;