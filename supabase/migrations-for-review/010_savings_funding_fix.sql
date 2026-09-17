-- ============================================================================
-- Schelden Bank — 010_savings_funding_fix.sql
-- Incremental migration. Assumes 001–009 are already applied.
-- Run manually in the Supabase SQL Editor after review.
--
-- Bug fixed here:
--   Migration 008 added savings_goals_guard(), which on UPDATE forces
--     new.saved_amount := old.saved_amount
--   to stop customers writing their own balance. That trigger also fired for
--   the UPDATE inside fund_savings_goal()/withdraw_savings_goal(), so the
--   account was debited and a transaction was posted, but the goal balance
--   never moved.
--
--   Fix: the guard now allows the change only while the trusted funding
--   functions are running, signalled by a transaction-local setting that
--   customers cannot set through PostgREST.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Guard honours an internal, transaction-local override
-- ---------------------------------------------------------------------------
create or replace function public.savings_goals_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _internal boolean := coalesce(
    current_setting('schelden.savings_internal', true) = 'on', false
  );
begin
  if tg_op = 'INSERT' then
    if not _internal then
      new.saved_amount := 0;
    end if;
    return new;
  end if;

  new.id         := old.id;
  new.user_id    := old.user_id;
  new.created_at := old.created_at;
  if not _internal then
    new.saved_amount := old.saved_amount;
  end if;
  return new;
end;
$$;

revoke all on function public.savings_goals_guard() from public, anon, authenticated;
grant execute on function public.savings_goals_guard() to service_role;

-- ---------------------------------------------------------------------------
-- 2. Funding sets the override around its own update
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

  perform set_config('schelden.savings_internal', 'on', true);
  update public.savings_goals
     set saved_amount = saved_amount + _amount
   where id = _goal.id
   returning * into _goal;
  perform set_config('schelden.savings_internal', 'off', true);

  insert into public.audit_logs (action, target_user, target_table, target_id, new_value, reason)
  values ('savings.fund', _uid, 'savings_goals', _goal.id,
          jsonb_build_object('amount', _amount, 'account_id', _acct.id, 'transaction_id', _tx_id),
          'Customer funded a savings goal');

  return _goal;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Same override around withdrawals
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

  perform set_config('schelden.savings_internal', 'on', true);
  update public.savings_goals
     set saved_amount = saved_amount - _amount
   where id = _goal.id
   returning * into _goal;
  perform set_config('schelden.savings_internal', 'off', true);

  insert into public.audit_logs (action, target_user, target_table, target_id, new_value, reason)
  values ('savings.withdraw', _uid, 'savings_goals', _goal.id,
          jsonb_build_object('amount', _amount, 'account_id', _acct.id, 'transaction_id', _tx_id),
          'Customer released money from a savings goal');

  return _goal;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Repair goals that were funded while the bug was live
--    Sets each goal's balance to the amount actually taken from accounts
--    (funds minus releases) as recorded in audit_logs, whenever the stored
--    balance is lower than that. Money already debited is credited to the
--    goal instead of being credited back to the account, so no balance is
--    created out of nothing. Safe to run once.
-- ---------------------------------------------------------------------------
select set_config('schelden.savings_internal', 'on', true);

with moved as (
  select
    a.target_id as goal_id,
    sum(
      case when a.action = 'savings.fund' then (a.new_value->>'amount')::numeric
           when a.action = 'savings.withdraw' then -((a.new_value->>'amount')::numeric)
           else 0 end
    ) as net_amount
  from public.audit_logs a
  where a.target_table = 'savings_goals'
    and a.action in ('savings.fund', 'savings.withdraw')
  group by a.target_id
)
update public.savings_goals g
   set saved_amount = moved.net_amount
  from moved
 where g.id = moved.goal_id
   and moved.net_amount >= 0
   and g.saved_amount < moved.net_amount;

select set_config('schelden.savings_internal', 'off', true);

commit;
