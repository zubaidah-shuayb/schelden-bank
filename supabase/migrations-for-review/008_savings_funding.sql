-- ============================================================================
-- Schelden Bank — 008_savings_funding.sql
-- Incremental migration. Assumes 001–007 are already applied.
-- Run manually in the Supabase SQL Editor after review.
--
-- Purpose: money put into a savings goal must come out of a real account
-- balance. Customers can no longer type an arbitrary "saved amount".
--   * savings_goals.saved_amount becomes system-controlled (guard trigger).
--   * Funding and withdrawing go through security-definer functions that
--     check ownership, check available funds, move the balance and post an
--     auditable transaction — exactly like every other money movement.
-- No seed/demo banking data.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. saved_amount can never be negative, and customers cannot write it
-- ---------------------------------------------------------------------------
do $$ begin
  alter table public.savings_goals
    add constraint savings_goals_saved_amount_nonneg check (saved_amount >= 0);
exception when duplicate_object then null; end $$;

-- Customers may still create/rename/delete goals, but not the balance column.
revoke update on public.savings_goals from authenticated;
grant update (name, target_amount, target_date) on public.savings_goals to authenticated;

create or replace function public.savings_goals_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- A new goal always starts empty; money only arrives through funding.
    new.saved_amount := 0;
    return new;
  end if;
  new.id           := old.id;
  new.user_id      := old.user_id;
  new.saved_amount := old.saved_amount;
  new.created_at   := old.created_at;
  return new;
end;
$$;

drop trigger if exists savings_goals_guard_trg on public.savings_goals;
create trigger savings_goals_guard_trg
before insert or update on public.savings_goals
for each row execute function public.savings_goals_guard();

revoke all on function public.savings_goals_guard() from public, anon, authenticated;
grant execute on function public.savings_goals_guard() to service_role;

-- ---------------------------------------------------------------------------
-- 2. Fund a goal from one of the customer's own accounts
-- ---------------------------------------------------------------------------
create or replace function public.fund_savings_goal(
  _goal_id uuid, _account_id uuid, _amount numeric
)
returns public.savings_goals
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _goal public.savings_goals;
  _acct public.accounts;
  _tx_id uuid;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  if _amount is null or _amount <= 0 then
    raise exception 'Enter an amount above zero';
  end if;
  _amount := round(_amount, 2);

  select * into _goal from public.savings_goals
    where id = _goal_id and user_id = _uid for update;
  if not found then raise exception 'Savings goal not found'; end if;

  select * into _acct from public.accounts
    where id = _account_id and user_id = _uid for update;
  if not found then raise exception 'Account not found'; end if;
  if _acct.status <> 'active' then raise exception 'That account is not active'; end if;
  if coalesce(_acct.available_balance, _acct.balance) < _amount then
    raise exception 'Not enough money in that account';
  end if;

  insert into public.transactions (
    reference_code, account_id, user_id, type, status, amount, currency,
    description, reference, balance_before, balance_after, reason, occurred_at
  ) values (
    public.generate_reference_code(), _acct.id, _uid, 'transfer', 'completed',
    _amount, _acct.currency,
    'Savings goal — ' || _goal.name, 'SAVINGS',
    _acct.balance, _acct.balance - _amount,
    'Transfer to savings goal', now()
  ) returning id into _tx_id;

  update public.accounts
     set balance = balance - _amount,
         available_balance = coalesce(available_balance, balance) - _amount
   where id = _acct.id;

  update public.savings_goals
     set saved_amount = saved_amount + _amount
   where id = _goal.id
   returning * into _goal;

  insert into public.audit_logs (action, target_user, target_table, target_id, new_value, reason)
  values ('savings.fund', _uid, 'savings_goals', _goal.id,
          jsonb_build_object('amount', _amount, 'account_id', _acct.id, 'transaction_id', _tx_id),
          'Customer funded a savings goal');

  return _goal;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Take money back out of a goal, into one of the customer's own accounts
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_savings_goal(
  _goal_id uuid, _account_id uuid, _amount numeric
)
returns public.savings_goals
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _goal public.savings_goals;
  _acct public.accounts;
  _tx_id uuid;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  if _amount is null or _amount <= 0 then
    raise exception 'Enter an amount above zero';
  end if;
  _amount := round(_amount, 2);

  select * into _goal from public.savings_goals
    where id = _goal_id and user_id = _uid for update;
  if not found then raise exception 'Savings goal not found'; end if;
  if _goal.saved_amount < _amount then
    raise exception 'That goal does not hold that much';
  end if;

  select * into _acct from public.accounts
    where id = _account_id and user_id = _uid for update;
  if not found then raise exception 'Account not found'; end if;
  if _acct.status <> 'active' then raise exception 'That account is not active'; end if;

  insert into public.transactions (
    reference_code, account_id, user_id, type, status, amount, currency,
    description, reference, balance_before, balance_after, reason, occurred_at
  ) values (
    public.generate_reference_code(), _acct.id, _uid, 'transfer', 'completed',
    _amount, _acct.currency,
    'Savings goal release — ' || _goal.name, 'SAVINGS',
    _acct.balance, _acct.balance + _amount,
    'Transfer from savings goal', now()
  ) returning id into _tx_id;

  update public.accounts
     set balance = balance + _amount,
         available_balance = coalesce(available_balance, balance) + _amount
   where id = _acct.id;

  update public.savings_goals
     set saved_amount = saved_amount - _amount
   where id = _goal.id
   returning * into _goal;

  insert into public.audit_logs (action, target_user, target_table, target_id, new_value, reason)
  values ('savings.withdraw', _uid, 'savings_goals', _goal.id,
          jsonb_build_object('amount', _amount, 'account_id', _acct.id, 'transaction_id', _tx_id),
          'Customer released money from a savings goal');

  return _goal;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Deleting a goal must not make money disappear
-- ---------------------------------------------------------------------------
create or replace function public.savings_goals_delete_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.saved_amount > 0 then
    raise exception 'Move the money back to an account before deleting this goal';
  end if;
  return old;
end;
$$;

drop trigger if exists savings_goals_delete_guard_trg on public.savings_goals;
create trigger savings_goals_delete_guard_trg
before delete on public.savings_goals
for each row execute function public.savings_goals_delete_guard();

revoke all on function public.savings_goals_delete_guard() from public, anon, authenticated;
grant execute on function public.savings_goals_delete_guard() to service_role;

-- ---------------------------------------------------------------------------
-- 5. Permissions
-- ---------------------------------------------------------------------------
revoke all on function public.fund_savings_goal(uuid, uuid, numeric) from public, anon;
revoke all on function public.withdraw_savings_goal(uuid, uuid, numeric) from public, anon;
grant execute on function public.fund_savings_goal(uuid, uuid, numeric) to authenticated;
grant execute on function public.withdraw_savings_goal(uuid, uuid, numeric) to authenticated;

commit;
