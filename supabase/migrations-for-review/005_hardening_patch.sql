-- ============================================================================
-- Schelden Bank — 005_hardening_patch.sql
-- Incremental hardening patch. Assumes 001–004 are already applied.
-- Safe to run once; also safe to re-run (everything is idempotent).
--
-- Contents
--   A. Column-level write permissions (replaces broad UPDATE grants)
--   B. One-reversal-per-transaction constraint
--   C. RLS policy corrections (support conversations + messages, profiles)
--   D. Column guard triggers (profiles, cards, notifications, support)
--   E. Hardened reversal + audited verification status
--   F. Support inactivity: 60-minute two-sided clearing, restricted execution
--   G. Realtime — rerun-safe
--   H. pg_cron schedule for the automatic 60-minute clearing (required feature)
--
-- Nothing in this file drops data or recreates tables.
-- ============================================================================

begin;

-- ============================================================================
-- A. Column-level write permissions                     (belongs in 001)
-- ============================================================================

-- Support messages: append-only plus a read receipt. No delete.
revoke update, delete on public.support_messages from authenticated;
grant select, insert on public.support_messages to authenticated;
grant update (read_at) on public.support_messages to authenticated;

-- Support conversations: customers own subject + their typing flag; admins own
-- triage fields (per-role enforcement in section D).
-- last_activity_at and cleared_at are never client-writable.
revoke update, delete on public.support_conversations from authenticated;
grant select, insert on public.support_conversations to authenticated;
grant update (subject, user_typing_at, admin_typing_at, status, priority,
  internal_notes, assigned_admin) on public.support_conversations to authenticated;

-- Profiles: genuine personal fields only.
revoke update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, date_of_birth, nationality,
  address_street, address_postal_code, address_city, address_country,
  avatar_path, onboarding_completed) on public.profiles to authenticated;

-- Notifications: read receipts only.
revoke update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Cards: customer switches, limits, freeze/unfreeze only.
revoke update, delete on public.cards from authenticated;
grant select on public.cards to authenticated;
grant update (daily_limit, monthly_limit, online_payments_enabled,
  contactless_enabled, international_enabled, status) on public.cards to authenticated;

-- Financial records stay read-only for every logged-in client.
revoke insert, update, delete on public.accounts from authenticated;
revoke insert, update, delete on public.transactions from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.investment_holdings from authenticated;
revoke insert, update, delete on public.documents from authenticated;
revoke insert, update, delete on public.security_events from authenticated;
revoke insert, update, delete on public.admin_users from authenticated;

grant all on all tables in schema public to service_role;

-- ============================================================================
-- B. A transaction can be reversed at most once           (belongs in 001)
-- ============================================================================
create unique index if not exists transactions_one_reversal_per_original
  on public.transactions (reversal_of)
  where reversal_of is not null;

-- ============================================================================
-- C. RLS policy corrections                               (belongs in 002)
-- ============================================================================

-- Administrators change verification status only through the audited function.
drop policy if exists profiles_admin_update on public.profiles;

-- Conversation inserts must start neutral.
drop policy if exists support_conv_insert_own on public.support_conversations;
create policy support_conv_insert_own on public.support_conversations
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'open'
    and priority = 'normal'
    and internal_notes is null
    and assigned_admin is null
    and cleared_at is null
  );

-- Split customer and administrator update paths.
drop policy if exists support_conv_update on public.support_conversations;
drop policy if exists support_conv_update_own on public.support_conversations;
create policy support_conv_update_own on public.support_conversations
  for update to authenticated
  using (user_id = auth.uid() and not public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists support_conv_update_admin on public.support_conversations;
create policy support_conv_update_admin on public.support_conversations
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Messages: read receipts only, and only on the other side's messages.
drop policy if exists support_msg_update on public.support_messages;
drop policy if exists support_msg_update_read on public.support_messages;
create policy support_msg_update_read on public.support_messages
  for update to authenticated
  using (
    (public.is_admin() and sender_role = 'customer')
    or (
      sender_role = 'admin'
      and exists (
        select 1 from public.support_conversations c
        where c.id = conversation_id and c.user_id = auth.uid()
      )
    )
  )
  with check (true);

-- Never allow client deletes of conversation history.
drop policy if exists support_msg_delete on public.support_messages;
drop policy if exists support_msg_delete_own on public.support_messages;
drop policy if exists support_conv_delete on public.support_conversations;
drop policy if exists support_conv_delete_own on public.support_conversations;

-- ============================================================================
-- D. Column guard triggers                                (belongs in 003)
-- ============================================================================

create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin(auth.uid()) then
    new.updated_at := now();
    return new;
  end if;
  new.id                  := old.id;
  new.email               := old.email;
  new.verification_status := old.verification_status;
  new.created_at          := old.created_at;
  new.updated_at          := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg
before update on public.profiles
for each row execute function public.profiles_guard();

create or replace function public.cards_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;
  new.id              := old.id;
  new.user_id         := old.user_id;
  new.account_id      := old.account_id;
  new.card_type       := old.card_type;
  new.masked_number   := old.masked_number;
  new.cardholder_name := old.cardholder_name;
  new.expiry_month    := old.expiry_month;
  new.expiry_year     := old.expiry_year;
  new.issued_at       := old.issued_at;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'active' and new.status = 'frozen')
      or (old.status = 'frozen' and new.status = 'active')
    ) then
      raise exception 'Only freeze and unfreeze are permitted';
    end if;
  end if;

  if new.daily_limit < 0 or new.monthly_limit < 0 then
    raise exception 'Limits cannot be negative';
  end if;
  return new;
end;
$$;

drop trigger if exists cards_guard_trg on public.cards;
create trigger cards_guard_trg
before update on public.cards
for each row execute function public.cards_guard();

create or replace function public.notifications_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id         := old.id;
  new.user_id    := old.user_id;
  new.category   := old.category;
  new.title      := old.title;
  new.body       := old.body;
  new.link_path  := old.link_path;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists notifications_guard_trg on public.notifications;
create trigger notifications_guard_trg
before update on public.notifications
for each row execute function public.notifications_guard();

create or replace function public.support_conv_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id         := old.id;
  new.user_id    := old.user_id;
  new.created_at := old.created_at;

  if public.is_admin(auth.uid()) then
    new.last_activity_at := old.last_activity_at;
    new.cleared_at       := old.cleared_at;
    new.user_typing_at   := old.user_typing_at;
    return new;
  end if;

  new.status           := old.status;
  new.priority         := old.priority;
  new.internal_notes   := old.internal_notes;
  new.assigned_admin   := old.assigned_admin;
  new.admin_typing_at  := old.admin_typing_at;
  new.last_activity_at := old.last_activity_at;
  new.cleared_at       := old.cleared_at;
  return new;
end;
$$;

drop trigger if exists support_conv_guard_trg on public.support_conversations;
create trigger support_conv_guard_trg
before update on public.support_conversations
for each row execute function public.support_conv_guard();

create or replace function public.support_msg_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id              := old.id;
  new.conversation_id := old.conversation_id;
  new.sender_id       := old.sender_id;
  new.sender_role     := old.sender_role;
  new.body            := old.body;
  new.attachment_path := old.attachment_path;
  new.attachment_type := old.attachment_type;
  new.created_at      := old.created_at;

  if old.read_at is not null then
    new.read_at := old.read_at;
  elsif new.read_at is not null then
    new.read_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists support_msg_guard_trg on public.support_messages;
create trigger support_msg_guard_trg
before update on public.support_messages
for each row execute function public.support_msg_guard();

-- ============================================================================
-- E. Hardened reversal + audited verification status      (belongs in 003)
-- ============================================================================

create or replace function public.admin_reverse_transaction(
  _transaction_id uuid, _reason text default 'Reversal'
)
returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  _orig public.transactions;
  _reverse_type public.transaction_type;
  _tx public.transactions;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorised';
  end if;

  select * into _orig from public.transactions where id = _transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;

  if _orig.reversal_of is not null or _orig.type = 'reversal' then
    raise exception 'A reversal cannot itself be reversed';
  end if;
  if _orig.status = 'reversed' then
    raise exception 'Transaction already reversed';
  end if;
  if _orig.status <> 'completed' then
    raise exception 'Only a completed transaction can be reversed';
  end if;
  if exists (select 1 from public.transactions r where r.reversal_of = _orig.id) then
    raise exception 'Transaction already reversed';
  end if;

  _reverse_type := case
    when _orig.type in ('credit','deposit','refund','interest') then 'debit'::public.transaction_type
    else 'credit'::public.transaction_type
  end;

  _tx := public.admin_create_transaction(
    _orig.account_id, _reverse_type, _orig.amount,
    'Reversal of ' || _orig.reference_code, _orig.reference,
    'completed', now(), _reason, _orig.id
  );

  update public.transactions set status = 'reversed' where id = _orig.id;
  return _tx;
end;
$$;

create or replace function public.admin_set_verification_status(
  _user_id uuid, _status public.verification_status, _reason text default null
)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  _admin uuid := auth.uid();
  _admin_email text;
  _before public.verification_status;
  _row public.profiles;
begin
  if not public.is_admin(_admin) then raise exception 'Not authorised'; end if;
  select email into _admin_email from public.admin_users where user_id = _admin;

  select verification_status into _before from public.profiles where id = _user_id for update;
  if not found then raise exception 'Profile not found'; end if;

  update public.profiles
     set verification_status = _status, updated_at = now()
   where id = _user_id
  returning * into _row;

  insert into public.audit_logs (
    admin_id, admin_email, action, target_user, target_table, target_id,
    previous_value, new_value, reason
  ) values (
    _admin, _admin_email, 'verification_status_changed', _user_id, 'profiles', _user_id,
    jsonb_build_object('verification_status', _before),
    jsonb_build_object('verification_status', _status), _reason
  );

  return _row;
end;
$$;

revoke all on function public.admin_reverse_transaction(uuid, text) from public, anon;
revoke all on function public.admin_set_verification_status(uuid, public.verification_status, text) from public, anon;
grant execute on function public.admin_reverse_transaction(uuid, text) to authenticated;
grant execute on function public.admin_set_verification_status(uuid, public.verification_status, text) to authenticated;

-- ============================================================================
-- F. Support inactivity — 60 minutes of silence from BOTH sides  (003)
-- ============================================================================

-- Any message from either side resets the clock.
create or replace function public.touch_support_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.support_conversations
     set last_activity_at = now(),
         cleared_at = null
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_support_message_activity on public.support_messages;
create trigger on_support_message_activity
after insert on public.support_messages
for each row execute function public.touch_support_activity();

-- Global sweep: scheduler + service role only. Not callable by a logged-in user.
create or replace function public.clear_inactive_support_conversations()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  _count integer;
begin
  with stale as (
    select id from public.support_conversations
     where last_activity_at < now() - interval '60 minutes'
       and cleared_at is null
  )
  delete from public.support_messages m using stale s where m.conversation_id = s.id;

  update public.support_conversations
     set cleared_at = now(), status = 'closed'
   where last_activity_at < now() - interval '60 minutes'
     and cleared_at is null;

  get diagnostics _count = row_count;
  return _count;
end;
$$;

revoke all on function public.clear_inactive_support_conversations() from public, anon, authenticated;
grant execute on function public.clear_inactive_support_conversations() to service_role;

-- Safe per-conversation version for the app.
create or replace function public.clear_my_inactive_conversation(_conversation_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  _conv public.support_conversations;
begin
  select * into _conv from public.support_conversations
   where id = _conversation_id for update;
  if not found then return false; end if;

  if not (public.is_admin(auth.uid()) or _conv.user_id = auth.uid()) then
    raise exception 'Not authorised';
  end if;

  if _conv.cleared_at is not null
     or _conv.last_activity_at >= now() - interval '60 minutes' then
    return false;
  end if;

  delete from public.support_messages where conversation_id = _conv.id;
  update public.support_conversations
     set cleared_at = now(), status = 'closed'
   where id = _conv.id;
  return true;
end;
$$;

revoke all on function public.clear_my_inactive_conversation(uuid) from public, anon;
grant execute on function public.clear_my_inactive_conversation(uuid) to authenticated;

-- ============================================================================
-- G. Realtime — rerun-safe                                (belongs in 004)
-- ============================================================================
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

commit;

-- ============================================================================
-- H. pg_cron schedule — automatic 60-minute clearing (REQUIRED)
-- Run this block outside the transaction above; extension creation and
-- cron.schedule must not be wrapped with the rest.
-- ============================================================================
create extension if not exists pg_cron with schema cron;

-- Remove any previous version of the job, then (re)create it. Runs every
-- 5 minutes and clears any conversation silent for 60 minutes on both sides.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'schelden-clear-support') then
    perform cron.unschedule('schelden-clear-support');
  end if;
end $$;

select cron.schedule(
  'schelden-clear-support',
  '*/5 * * * *',
  $$select public.clear_inactive_support_conversations();$$
);

-- Verify afterwards with:
--   select jobname, schedule, active from cron.job where jobname = 'schelden-clear-support';
--   select * from cron.job_run_details order by start_time desc limit 5;
