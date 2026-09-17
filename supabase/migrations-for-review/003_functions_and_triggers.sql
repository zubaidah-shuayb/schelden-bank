-- ============================================================================
-- Schelden Bank — 003_functions_and_triggers.sql   (HARDENED REVISION)
-- Protected server-side operations. Run AFTER 002.
--
-- What this migration does:
--  1. Creates a profile automatically when someone signs up.
--  2. Grants administrator status ONLY when a verified email matches the
--     allowlist, keyed to the auth user UUID.
--  3. Provides the only functions allowed to move money: admin_credit,
--     admin_debit, admin_create_transaction, admin_reverse_transaction.
--     Each verifies the caller is an administrator and writes an audit record.
--  4. Column guard triggers for profiles, cards, notifications and support.
--  5. Keeps the Live Support inactivity timer fresh and clears conversation
--     contents after 60 minutes of silence from BOTH sides.
--
-- CHANGES IN THIS REVISION
--  * Reversals: original row locked FOR UPDATE, an already-reversed original is
--    refused, and a reversal row itself can never be reversed.
--  * Guard triggers reject writes to admin/system columns even if a grant or
--    policy is ever widened.
--  * clear_inactive_support_conversations() is no longer callable by ordinary
--    logged-in users; customers use clear_my_inactive_conversation(uuid), which
--    only ever touches one conversation they own and only after 60 minutes of
--    two-sided silence.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, first_name, last_name, phone, date_of_birth, nationality,
    address_street, address_postal_code, address_city, address_country
  ) values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date,
    new.raw_user_meta_data ->> 'nationality',
    new.raw_user_meta_data ->> 'address_street',
    new.raw_user_meta_data ->> 'address_postal_code',
    new.raw_user_meta_data ->> 'address_city',
    coalesce(new.raw_user_meta_data ->> 'address_country', 'Belgium')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Administrator grant — verified email + allowlist, keyed to the UUID
-- ---------------------------------------------------------------------------
create or replace function public.grant_admin_if_allowlisted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and exists (select 1 from public.admin_allowlist a where a.email = lower(new.email))
  then
    insert into public.admin_users (user_id, email)
    values (new.id, lower(new.email))
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_admin on auth.users;
create trigger on_auth_user_created_grant_admin
after insert on auth.users
for each row execute function public.grant_admin_if_allowlisted();

drop trigger if exists on_auth_user_confirmed_grant_admin on auth.users;
create trigger on_auth_user_confirmed_grant_admin
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_admin_if_allowlisted();

-- ---------------------------------------------------------------------------
-- 3. Protected financial operations
-- ---------------------------------------------------------------------------
create or replace function public.generate_reference_code()
returns text
language sql
volatile
as $$
  select 'TX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

-- Core engine: posts one transaction and moves the account balance atomically.
create or replace function public.admin_create_transaction(
  _account_id uuid,
  _type public.transaction_type,
  _amount numeric,
  _description text,
  _reference text default null,
  _status public.transaction_status default 'completed',
  _occurred_at timestamptz default now(),
  _reason text default null,
  _reversal_of uuid default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin uuid := auth.uid();
  _admin_email text;
  _account public.accounts;
  _signed numeric;
  _before numeric;
  _after numeric;
  _tx public.transactions;
begin
  if not public.is_admin(_admin) then
    raise exception 'Not authorised';
  end if;
  if _amount is null or _amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select email into _admin_email from public.admin_users where user_id = _admin;

  select * into _account from public.accounts where id = _account_id for update;
  if not found then
    raise exception 'Account not found';
  end if;

  -- Money-in types add, money-out types subtract.
  _signed := case
    when _type in ('credit','deposit','refund','interest','reversal') then _amount
    when _type in ('debit','withdrawal','fee','card_payment','atm_withdrawal','sepa_transfer','transfer') then -_amount
    else _amount -- adjustment/correction/other: caller passes a positive credit
  end;

  _before := _account.balance;
  _after  := case when _status = 'completed' then _before + _signed else _before end;

  insert into public.transactions (
    reference_code, account_id, user_id, type, status, amount, currency,
    description, reference, balance_before, balance_after, created_by_admin,
    reversal_of, reason, occurred_at
  ) values (
    public.generate_reference_code(), _account.id, _account.user_id, _type, _status,
    _amount, _account.currency, _description, _reference, _before, _after, _admin,
    _reversal_of, _reason, coalesce(_occurred_at, now())
  ) returning * into _tx;

  if _status = 'completed' then
    update public.accounts
       set balance = _after,
           available_balance = _after
     where id = _account.id;
  end if;

  insert into public.audit_logs (
    admin_id, admin_email, action, target_user, target_table, target_id,
    previous_value, new_value, reason
  ) values (
    _admin, _admin_email, 'transaction_created', _account.user_id, 'transactions', _tx.id,
    jsonb_build_object('balance', _before),
    jsonb_build_object('balance', _after, 'type', _type, 'amount', _amount, 'status', _status),
    _reason
  );

  insert into public.notifications (user_id, category, title, body, link_path)
  values (
    _account.user_id, 'transactions',
    case when _signed >= 0 then 'Money in' else 'Money out' end,
    _description || ' — ' || to_char(_amount, 'FM999G999G990D00') || ' EUR',
    '/transactions'
  );

  return _tx;
end;
$$;

create or replace function public.admin_credit_account(
  _account_id uuid, _amount numeric, _reason text, _reference text default null
)
returns public.transactions
language sql
security definer
set search_path = public
as $$
  select public.admin_create_transaction(
    _account_id, 'credit', _amount, coalesce(_reason, 'Credit'), _reference,
    'completed', now(), _reason, null
  );
$$;

create or replace function public.admin_debit_account(
  _account_id uuid, _amount numeric, _reason text, _reference text default null
)
returns public.transactions
language sql
security definer
set search_path = public
as $$
  select public.admin_create_transaction(
    _account_id, 'debit', _amount, coalesce(_reason, 'Debit'), _reference,
    'completed', now(), _reason, null
  );
$$;

-- Reversal: never edits or deletes the original; posts an opposite entry.
-- Hardened: the original is locked, a reversal cannot itself be reversed, and a
-- transaction can be reversed at most once (also enforced by the unique index
-- transactions_one_reversal_per_original in 001).
create or replace function public.admin_reverse_transaction(
  _transaction_id uuid, _reason text default 'Reversal'
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
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

-- Verification status is an administrator decision and always audited.
create or replace function public.admin_set_verification_status(
  _user_id uuid, _status public.verification_status, _reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.admin_create_transaction(uuid, public.transaction_type, numeric, text, text, public.transaction_status, timestamptz, text, uuid) from public, anon;
revoke all on function public.admin_credit_account(uuid, numeric, text, text) from public, anon;
revoke all on function public.admin_debit_account(uuid, numeric, text, text) from public, anon;
revoke all on function public.admin_reverse_transaction(uuid, text) from public, anon;
revoke all on function public.admin_set_verification_status(uuid, public.verification_status, text) from public, anon;

grant execute on function public.admin_create_transaction(uuid, public.transaction_type, numeric, text, text, public.transaction_status, timestamptz, text, uuid) to authenticated;
grant execute on function public.admin_credit_account(uuid, numeric, text, text) to authenticated;
grant execute on function public.admin_debit_account(uuid, numeric, text, text) to authenticated;
grant execute on function public.admin_reverse_transaction(uuid, text) to authenticated;
grant execute on function public.admin_set_verification_status(uuid, public.verification_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Column guard triggers
--    Grants already block these columns through the Data API; the triggers make
--    the rule hold for every path, including future policy changes.
-- ---------------------------------------------------------------------------

-- profiles: identity, verification and timestamps are not self-service.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- cards: customers may freeze/unfreeze and adjust their own switches only.
create or replace function public.cards_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- notifications: read receipts only.
create or replace function public.notifications_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- support_conversations: customers own subject and their own typing flag only.
create or replace function public.support_conv_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id         := old.id;
  new.user_id    := old.user_id;
  new.created_at := old.created_at;

  if public.is_admin(auth.uid()) then
    -- Timers belong to the system, never to a client statement.
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

-- support_messages: append-only. Only read_at may move, and only forward.
create or replace function public.support_msg_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    new.read_at := old.read_at;  -- a read receipt is never unset or rewritten
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

-- ---------------------------------------------------------------------------
-- 5. Live Support inactivity handling (60 minutes, both sides)
-- ---------------------------------------------------------------------------
-- Every new message from EITHER side resets the inactivity clock.
create or replace function public.touch_support_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- Global sweep. NOT callable by ordinary logged-in users: it is reserved for
-- the scheduler (pg_cron) and the service role.
create or replace function public.clear_inactive_support_conversations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
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

-- Safe per-conversation equivalent for the app: clears exactly one conversation
-- the caller is party to, and only when both sides have been silent for
-- 60 minutes. Returns true when the conversation was cleared.
create or replace function public.clear_my_inactive_conversation(_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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

-- Automatic schedule (recommended, so conversations clear even with nobody
-- watching). Requires pg_cron, available in Supabase under Database → Extensions.
-- create extension if not exists pg_cron;
-- select cron.schedule('schelden-clear-support', '*/5 * * * *',
--   $$select public.clear_inactive_support_conversations();$$);
