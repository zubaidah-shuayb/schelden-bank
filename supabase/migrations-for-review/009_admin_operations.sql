-- ============================================================================
-- Schelden Bank — 009_admin_operations.sql
-- Phase 4: Admin Command Centre
--
-- Assumes 001–005 are applied (006–008 are independent of this file).
-- Safe to run once; every statement is idempotent / rerun-safe.
--
-- Nothing here loosens customer permissions. It adds the audited,
-- security-definer operations the operations console needs:
--   A. Account opening / account status
--   B. Card issuance
--   C. System notifications to a customer
--   D. Risk case management (grants only; RLS already admin-only)
-- Every function re-checks public.is_admin(auth.uid()) inside the database, so
-- authorisation can never be decided by the browser.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Accounts
-- ---------------------------------------------------------------------------

-- Belgian-style IBAN: BE + 2 check digits + 12 digits. Retries on collision.
create or replace function public.generate_be_iban()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  _candidate text;
  _i int := 0;
begin
  loop
    _i := _i + 1;
    _candidate := 'BE' || lpad((floor(random() * 90) + 10)::int::text, 2, '0')
                       || lpad((floor(random() * 1000000000000))::bigint::text, 12, '0');
    exit when not exists (select 1 from public.accounts where iban = _candidate);
    if _i > 20 then
      raise exception 'Could not allocate an IBAN';
    end if;
  end loop;
  return _candidate;
end;
$$;

-- Opens an account with a zero balance. Money only ever arrives through
-- admin_create_transaction, so this can never create value silently.
create or replace function public.admin_open_account(
  _user_id uuid,
  _account_type public.account_type,
  _reason text default null
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin uuid := auth.uid();
  _admin_email text;
  _row public.accounts;
begin
  if not public.is_admin(_admin) then raise exception 'Not authorised'; end if;
  if not exists (select 1 from public.profiles where id = _user_id) then
    raise exception 'Customer not found';
  end if;

  select email into _admin_email from public.admin_users where user_id = _admin;

  insert into public.accounts (user_id, account_type, iban, currency, balance, available_balance)
  values (_user_id, _account_type, public.generate_be_iban(), 'EUR', 0, 0)
  returning * into _row;

  insert into public.audit_logs (
    admin_id, admin_email, action, target_user, target_table, target_id, new_value, reason
  ) values (
    _admin, _admin_email, 'account_opened', _user_id, 'accounts', _row.id,
    jsonb_build_object('account_type', _account_type, 'iban', _row.iban), _reason
  );

  insert into public.notifications (user_id, category, title, body, link_path)
  values (_user_id, 'system', 'New account opened',
          initcap(replace(_account_type::text, '_', ' ')) || ' account ' || _row.iban || ' is ready.',
          '/accounts');

  return _row;
end;
$$;

create or replace function public.admin_set_account_status(
  _account_id uuid,
  _status public.account_status,
  _reason text default null
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin uuid := auth.uid();
  _admin_email text;
  _before public.account_status;
  _row public.accounts;
begin
  if not public.is_admin(_admin) then raise exception 'Not authorised'; end if;
  select email into _admin_email from public.admin_users where user_id = _admin;

  select status into _before from public.accounts where id = _account_id for update;
  if not found then raise exception 'Account not found'; end if;

  update public.accounts set status = _status where id = _account_id returning * into _row;

  insert into public.audit_logs (
    admin_id, admin_email, action, target_user, target_table, target_id,
    previous_value, new_value, reason
  ) values (
    _admin, _admin_email, 'account_status_changed', _row.user_id, 'accounts', _row.id,
    jsonb_build_object('status', _before), jsonb_build_object('status', _status), _reason
  );

  return _row;
end;
$$;

-- ---------------------------------------------------------------------------
-- B. Cards
-- ---------------------------------------------------------------------------
create or replace function public.admin_issue_card(
  _account_id uuid,
  _card_type public.card_type,
  _cardholder_name text default null,
  _reason text default null
)
returns public.cards
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin uuid := auth.uid();
  _admin_email text;
  _account public.accounts;
  _name text;
  _row public.cards;
begin
  if not public.is_admin(_admin) then raise exception 'Not authorised'; end if;
  select email into _admin_email from public.admin_users where user_id = _admin;

  select * into _account from public.accounts where id = _account_id;
  if not found then raise exception 'Account not found'; end if;

  select coalesce(nullif(trim(_cardholder_name), ''),
                  upper(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))))
    into _name
    from public.profiles p where p.id = _account.user_id;

  insert into public.cards (
    user_id, account_id, card_type, masked_number, cardholder_name,
    expiry_month, expiry_year, status
  ) values (
    _account.user_id, _account.id, _card_type,
    '•••• •••• •••• ' || lpad((floor(random() * 10000))::int::text, 4, '0'),
    coalesce(nullif(_name, ''), 'SCHELDEN CARDHOLDER'),
    extract(month from now())::int,
    extract(year from now())::int + 4,
    'active'
  ) returning * into _row;

  insert into public.audit_logs (
    admin_id, admin_email, action, target_user, target_table, target_id, new_value, reason
  ) values (
    _admin, _admin_email, 'card_issued', _account.user_id, 'cards', _row.id,
    jsonb_build_object('card_type', _card_type, 'masked_number', _row.masked_number), _reason
  );

  insert into public.notifications (user_id, category, title, body, link_path)
  values (_account.user_id, 'system', 'New card issued',
          'A new card ending ' || right(_row.masked_number, 4) || ' is active on your account.',
          '/cards');

  return _row;
end;
$$;

-- ---------------------------------------------------------------------------
-- C. System notifications (customers may never insert notifications)
-- ---------------------------------------------------------------------------
create or replace function public.admin_send_notification(
  _user_id uuid,
  _category public.notification_category,
  _title text,
  _body text,
  _link_path text default null
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin uuid := auth.uid();
  _admin_email text;
  _row public.notifications;
begin
  if not public.is_admin(_admin) then raise exception 'Not authorised'; end if;
  if coalesce(trim(_title), '') = '' then raise exception 'Title is required'; end if;
  select email into _admin_email from public.admin_users where user_id = _admin;

  insert into public.notifications (user_id, category, title, body, link_path)
  values (_user_id, _category, _title, _body, _link_path)
  returning * into _row;

  insert into public.audit_logs (
    admin_id, admin_email, action, target_user, target_table, target_id, new_value
  ) values (
    _admin, _admin_email, 'notification_sent', _user_id, 'notifications', _row.id,
    jsonb_build_object('category', _category, 'title', _title)
  );

  return _row;
end;
$$;

-- ---------------------------------------------------------------------------
-- D. Permissions
-- ---------------------------------------------------------------------------
revoke all on function public.admin_open_account(uuid, public.account_type, text) from public, anon;
revoke all on function public.admin_set_account_status(uuid, public.account_status, text) from public, anon;
revoke all on function public.admin_issue_card(uuid, public.card_type, text, text) from public, anon;
revoke all on function public.admin_send_notification(uuid, public.notification_category, text, text, text) from public, anon;
revoke all on function public.generate_be_iban() from public, anon;

grant execute on function public.admin_open_account(uuid, public.account_type, text) to authenticated;
grant execute on function public.admin_set_account_status(uuid, public.account_status, text) to authenticated;
grant execute on function public.admin_issue_card(uuid, public.card_type, text, text) to authenticated;
grant execute on function public.admin_send_notification(uuid, public.notification_category, text, text, text) to authenticated;

-- Risk cases: RLS (002) already restricts every command to administrators;
-- these grants let that policy actually be exercised through the Data API.
grant insert, update on public.risk_cases to authenticated;

-- Audit logs stay read-only for every client, administrators included.
revoke insert, update, delete on public.audit_logs from authenticated;
