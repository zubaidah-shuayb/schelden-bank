-- ============================================================================
-- Schelden Bank — 002_rls_policies.sql   (HARDENED REVISION)
-- Enables Row Level Security and defines every access policy.
-- Run AFTER 001.
--
-- Principles enforced here:
--  * Customers can READ their own banking records but can NEVER write balances
--    or financial transactions.
--  * Customers may write only personal/application data: profile fields,
--    beneficiaries, savings goals, loan simulations, support messages,
--    notification read state and their own card switches.
--  * Administrators are identified by auth.uid() existing in admin_users.
--    No email string or browser-supplied role is ever trusted.
--
-- CHANGES IN THIS REVISION
--  * RLS decides WHICH ROWS; the column-level grants in 001 and the guard
--    triggers in 003 decide WHICH COLUMNS. Comments below name the pairing.
--  * support_messages: no UPDATE policy beyond the read-receipt path, and no
--    DELETE policy at all — the ledger of a conversation is append-only until
--    the 60-minute inactivity clear runs server-side.
--  * support_conversations: update policy split into a customer path and an
--    admin path so customers cannot touch triage fields even if a future grant
--    widens by accident.
-- ============================================================================

-- Security-definer helper: avoids recursive policy evaluation.
create or replace function public.is_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = _user_id);
$$;

grant execute on function public.is_admin(uuid) to authenticated;

alter table public.profiles              enable row level security;
alter table public.accounts              enable row level security;
alter table public.transactions          enable row level security;
alter table public.beneficiaries         enable row level security;
alter table public.cards                 enable row level security;
alter table public.savings_goals         enable row level security;
alter table public.loan_simulations      enable row level security;
alter table public.investment_holdings   enable row level security;
alter table public.documents             enable row level security;
alter table public.notifications         enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages      enable row level security;
alter table public.security_events       enable row level security;
alter table public.risk_cases            enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.admin_users           enable row level security;
alter table public.admin_allowlist       enable row level security;

-- ---------------------------------------------------------------- profiles --
-- Column set restricted by the grant in 001 and by profiles_guard in 003.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Administrators change verification status through
-- public.admin_set_verification_status() in 003, which writes an audit record.
drop policy if exists profiles_admin_update on public.profiles;

-- ---------------------------------------------------------------- accounts --
-- READ ONLY for customers. All writes happen through server-side functions.
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------ transactions --
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- Deliberately no INSERT/UPDATE/DELETE policy: transactions are created only by
-- security-definer functions in 003.

-- ----------------------------------------------------------- beneficiaries --
drop policy if exists beneficiaries_all_own on public.beneficiaries;
create policy beneficiaries_all_own on public.beneficiaries
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------------- cards --
drop policy if exists cards_select on public.cards;
create policy cards_select on public.cards
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Customers may change only the columns granted in 001 (limits, switches,
-- freeze/unfreeze); cards_guard in 003 constrains status transitions.
drop policy if exists cards_update_own_settings on public.cards;
create policy cards_update_own_settings on public.cards
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cards_admin_write on public.cards;
create policy cards_admin_write on public.cards
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------- savings goals --
drop policy if exists savings_goals_all_own on public.savings_goals;
create policy savings_goals_all_own on public.savings_goals
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- -------------------------------------------------------- loan simulations --
drop policy if exists loan_sim_all_own on public.loan_simulations;
create policy loan_sim_all_own on public.loan_simulations
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- ----------------------------------------------------- investment holdings --
drop policy if exists investments_select on public.investment_holdings;
create policy investments_select on public.investment_holdings
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- --------------------------------------------------------------- documents --
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------- notifications --
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Only read_at is grantable (001) and notifications_guard (003) rejects any
-- other column change.
drop policy if exists notifications_mark_read on public.notifications;
create policy notifications_mark_read on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------- support (customer) --
drop policy if exists support_conv_select on public.support_conversations;
create policy support_conv_select on public.support_conversations
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

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

-- Customer path: own conversation only. The trigger support_conv_guard in 003
-- forces status, priority, internal_notes, assigned_admin, admin_typing_at,
-- last_activity_at and cleared_at back to their stored values for non-admins.
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

drop policy if exists support_msg_select on public.support_messages;
create policy support_msg_select on public.support_messages
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.support_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists support_msg_insert on public.support_messages;
create policy support_msg_insert on public.support_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and read_at is null
    and (
      (sender_role = 'admin' and public.is_admin())
      or (
        sender_role = 'customer'
        and not public.is_admin()
        and exists (
          select 1 from public.support_conversations c
          where c.id = conversation_id and c.user_id = auth.uid()
        )
      )
    )
  );

-- Read receipts only. The grant in 001 limits the statement to read_at and
-- support_msg_guard in 003 rejects any attempt to rewrite message content,
-- sender, role, conversation or attachment. A reader may only mark messages
-- written by the OTHER side as read.
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
-- No DELETE policy: clearing happens only through the 60-minute inactivity
-- routine in 003, which runs with elevated rights.

-- --------------------------------------------------------- security events --
drop policy if exists security_events_select on public.security_events;
create policy security_events_select on public.security_events
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------- admin-only --
drop policy if exists risk_cases_admin on public.risk_cases;
create policy risk_cases_admin on public.risk_cases
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using (public.is_admin());
-- No insert policy: audit rows are written only by security-definer functions.

drop policy if exists admin_users_read on public.admin_users;
create policy admin_users_read on public.admin_users
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- No write policies at all: membership is granted only by the trigger in 003.

-- admin_allowlist: no policies, so it is unreadable and unwritable from the
-- client. Only security-definer functions can see it.
