-- ============================================================================
-- Schelden Bank — 001_initial_schema.sql   (HARDENED REVISION)
-- Creates enums, core tables and grants. Safe to re-run (IF NOT EXISTS used).
-- Run this FIRST, in the Supabase SQL Editor.
-- No data is inserted. No demo/seed banking data exists anywhere.
--
-- CHANGES IN THIS REVISION
--  * Table-wide UPDATE grants replaced with COLUMN-LEVEL UPDATE grants so the
--    Data API physically refuses writes to admin/system fields (profiles,
--    cards, notifications, support_conversations, support_messages).
--  * support_messages: DELETE grant removed (append-only); UPDATE narrowed to
--    read_at only.
--  * support_conversations: last_activity_at and cleared_at are never grantable
--    to clients — only the triggers/functions in 003 may set them.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.account_type as enum ('current', 'savings', 'personal_reserve');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active', 'frozen', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum (
    'credit','debit','deposit','withdrawal','transfer','refund','reversal','fee',
    'interest','adjustment','correction','card_payment','atm_withdrawal','sepa_transfer','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_status as enum (
    'pending','processing','completed','failed','reversed','cancelled','flagged'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.card_type as enum ('physical_debit', 'virtual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.card_status as enum ('inactive','active','frozen','replaced','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum ('pending','verified','rejected','needs_information');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_status as enum ('open','waiting','in_progress','resolved','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_priority as enum ('low','normal','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_category as enum ('security','transactions','support','system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_level as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Admin allowlist (authorisation is keyed to the auth user UUID)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

-- Emails approved to become administrators. A row in admin_users is only ever
-- created by the trigger in 003 when a signup email matches this allowlist AND
-- the email is verified. No frontend path can insert here.
create table if not exists public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.admin_allowlist (email) values
  ('zubaidahshuayb000@gmail.com'),
  ('baekae0105@gmail.com')
on conflict (email) do nothing;

-- ----------------------------------------------------------------------------
-- Customer profile
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  date_of_birth date,
  nationality text,
  address_street text,
  address_postal_code text,
  address_city text,
  address_country text default 'Belgium',
  avatar_path text,
  verification_status public.verification_status not null default 'pending',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Accounts (balances are written only by protected server-side functions)
-- ----------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type public.account_type not null,
  iban text not null unique,
  currency text not null default 'EUR',
  balance numeric(14,2) not null default 0,
  available_balance numeric(14,2) not null default 0,
  status public.account_status not null default 'active',
  opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, account_type)
);
create index if not exists accounts_user_idx on public.accounts(user_id);

-- ----------------------------------------------------------------------------
-- Transactions (append-only ledger; reversals reference the original)
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  status public.transaction_status not null default 'completed',
  amount numeric(14,2) not null,
  currency text not null default 'EUR',
  description text not null,
  reference text,
  balance_before numeric(14,2),
  balance_after numeric(14,2),
  created_by_admin uuid references auth.users(id) on delete set null,
  reversal_of uuid references public.transactions(id) on delete set null,
  reason text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists transactions_account_idx on public.transactions(account_id, occurred_at desc);
create index if not exists transactions_user_idx on public.transactions(user_id, occurred_at desc);

-- A transaction can be reversed at most once: only one reversal row may point
-- at any given original. Enforced by the database, not only by function logic.
create unique index if not exists transactions_one_reversal_per_original
  on public.transactions(reversal_of) where reversal_of is not null;

-- ----------------------------------------------------------------------------
-- Beneficiaries (customer-owned application data)
-- ----------------------------------------------------------------------------
create table if not exists public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  iban text not null,
  bank_name text,
  reference text,
  created_at timestamptz not null default now()
);
create index if not exists beneficiaries_user_idx on public.beneficiaries(user_id);

-- ----------------------------------------------------------------------------
-- Cards (issued and controlled by the bank; customers toggle their own switches)
-- ----------------------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  card_type public.card_type not null,
  masked_number text not null,
  cardholder_name text not null,
  expiry_month smallint not null,
  expiry_year smallint not null,
  status public.card_status not null default 'inactive',
  daily_limit numeric(12,2) not null default 1000,
  monthly_limit numeric(12,2) not null default 5000,
  online_payments_enabled boolean not null default true,
  contactless_enabled boolean not null default true,
  international_enabled boolean not null default false,
  issued_at timestamptz not null default now()
);
create index if not exists cards_user_idx on public.cards(user_id);

-- ----------------------------------------------------------------------------
-- Savings goals (customer-owned)
-- ----------------------------------------------------------------------------
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  saved_amount numeric(12,2) not null default 0,
  target_date date,
  created_at timestamptz not null default now()
);
create index if not exists savings_goals_user_idx on public.savings_goals(user_id);

-- ----------------------------------------------------------------------------
-- Loan simulations and investment holdings (simulated products)
-- ----------------------------------------------------------------------------
create table if not exists public.loan_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  term_months integer not null,
  annual_rate numeric(5,2) not null,
  monthly_payment numeric(12,2) not null,
  total_repayment numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.investment_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument text not null,
  units numeric(14,4) not null,
  unit_value numeric(12,2) not null,
  allocation_percent numeric(5,2),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Documents, notifications
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  title text not null,
  category text not null,
  period_start date,
  period_end date,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notification_category not null,
  title text not null,
  body text not null,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Live Support
-- ----------------------------------------------------------------------------
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text,
  status public.support_status not null default 'open',
  priority public.support_priority not null default 'normal',
  internal_notes text,
  assigned_admin uuid references auth.users(id) on delete set null,
  user_typing_at timestamptz,
  admin_typing_at timestamptz,
  last_activity_at timestamptz not null default now(),
  cleared_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists support_conv_activity_idx on public.support_conversations(last_activity_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer','admin')),
  body text,
  attachment_path text,
  attachment_type text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_conv_idx on public.support_messages(conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- Security activity (Supabase Auth remains the session source of truth)
-- ----------------------------------------------------------------------------
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  description text not null,
  device_label text,
  ip_hint text,
  risk public.risk_level not null default 'low',
  created_at timestamptz not null default now()
);
create index if not exists security_events_user_idx on public.security_events(user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Risk cases and audit logs
-- ----------------------------------------------------------------------------
create table if not exists public.risk_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  level public.risk_level not null default 'low',
  title text not null,
  detail text,
  state text not null default 'open',
  notes text,
  handled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text,
  action text not null,
  target_user uuid references auth.users(id) on delete set null,
  target_table text,
  target_id uuid,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- ----------------------------------------------------------------------------
-- Grants (PostgREST needs these in addition to RLS)
-- Column-level UPDATE grants are the first line of defence: any column not
-- listed here cannot be written through the Data API by any logged-in user,
-- administrator included. Privileged fields move only through the
-- security-definer functions in 003.
-- ----------------------------------------------------------------------------
grant select on public.profiles, public.accounts, public.transactions, public.cards,
  public.beneficiaries, public.savings_goals, public.loan_simulations,
  public.investment_holdings, public.documents, public.notifications,
  public.support_conversations, public.support_messages, public.security_events,
  public.risk_cases, public.audit_logs, public.admin_users to authenticated;

grant insert, update, delete on public.beneficiaries, public.savings_goals,
  public.loan_simulations to authenticated;

-- Support messages are append-only: insert plus a read-receipt update. No delete.
revoke update, delete on public.support_messages from authenticated;
grant insert on public.support_messages to authenticated;
grant update (read_at) on public.support_messages to authenticated;

-- Support conversations: customers own subject + their typing flag; admins own
-- the triage fields (guarded per-role by the trigger in 003).
-- last_activity_at and cleared_at are deliberately NOT grantable.
revoke update on public.support_conversations from authenticated;
grant insert on public.support_conversations to authenticated;
grant update (subject, user_typing_at, admin_typing_at, status, priority,
  internal_notes, assigned_admin) on public.support_conversations to authenticated;

-- Profiles: only genuine personal fields. verification_status, onboarding is
-- customer-owned; email/id/created_at/updated_at are not client-writable.
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, phone, date_of_birth, nationality,
  address_street, address_postal_code, address_city, address_country,
  avatar_path, onboarding_completed) on public.profiles to authenticated;

-- Notifications: read receipts only.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Cards: customer switches, limits, and freeze/unfreeze (status transitions are
-- constrained by the trigger in 003).
revoke update on public.cards from authenticated;
grant update (daily_limit, monthly_limit, online_payments_enabled,
  contactless_enabled, international_enabled, status) on public.cards to authenticated;

grant all on all tables in schema public to service_role;
