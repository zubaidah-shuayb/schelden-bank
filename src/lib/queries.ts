import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address_street: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
  avatar_path: string | null;
  verification_status: string;
  onboarding_completed: boolean;
};

export type Account = {
  id: string;
  user_id: string;
  account_type: string;
  iban: string;
  currency: string;
  balance: number;
  available_balance: number;
  status: string;
  opened_at: string;
};

export type Transaction = {
  id: string;
  reference_code: string;
  account_id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  reference: string | null;
  balance_after: number | null;
  reversal_of: string | null;
  reason: string | null;
  occurred_at: string;
};

export type Card = {
  id: string;
  account_id: string;
  card_type: string;
  masked_number: string;
  cardholder_name: string;
  expiry_month: number;
  expiry_year: number;
  status: string;
  daily_limit: number;
  monthly_limit: number;
  online_payments_enabled: boolean;
  contactless_enabled: boolean;
  international_enabled: boolean;
};

export type Beneficiary = {
  id: string;
  name: string;
  iban: string;
  bank_name: string | null;
  reference: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
};

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    // maybeSingle() returns null when the profile row has not been created yet;
    // never coerce that into an array, callers expect Profile | null.
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Profile | null) ?? null;
    },
  });

export const accountsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["accounts", userId],
    queryFn: async () =>
      unwrap<Account[]>(
        (await supabase
          .from("accounts")
          .select("*")
          .eq("user_id", userId)
          .order("account_type")) as never,
      ),
  });

export const transactionsQuery = (userId: string, limit = 200) =>
  queryOptions({
    queryKey: ["transactions", userId, limit],
    queryFn: async () =>
      unwrap<Transaction[]>(
        (await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false })
          .limit(limit)) as never,
      ),
  });

export const cardsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["cards", userId],
    queryFn: async () =>
      unwrap<Card[]>(
        (await supabase
          .from("cards")
          .select("*")
          .eq("user_id", userId)
          .order("issued_at", { ascending: false })) as never,
      ),
  });

export const beneficiariesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["beneficiaries", userId],
    queryFn: async () =>
      unwrap<Beneficiary[]>(
        (await supabase
          .from("beneficiaries")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })) as never,
      ),
  });

export const notificationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["notifications", userId],
    queryFn: async () =>
      unwrap<NotificationRow[]>(
        (await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50)) as never,
      ),
  });

export type SavingsGoal = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  created_at: string;
};

export type LoanSimulation = {
  id: string;
  amount: number;
  term_months: number;
  annual_rate: number;
  monthly_payment: number;
  total_repayment: number;
  created_at: string;
};

export type Holding = {
  id: string;
  instrument: string;
  units: number;
  unit_value: number;
  allocation_percent: number | null;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  account_id: string | null;
  title: string;
  category: string;
  period_start: string | null;
  period_end: string | null;
  storage_path: string | null;
  created_at: string;
};

export type SecurityEvent = {
  id: string;
  event_type: string;
  description: string;
  device_label: string | null;
  ip_hint: string | null;
  risk: string;
  created_at: string;
};

export type CustomerPreferences = {
  user_id: string;
  security_email: boolean;
  transaction_email: boolean;
  support_email: boolean;
  product_email: boolean;
  push_enabled: boolean;
  updated_at: string;
};

export const savingsGoalsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["savings_goals", userId],
    queryFn: async () =>
      unwrap<SavingsGoal[]>(
        (await supabase
          .from("savings_goals")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })) as never,
      ),
  });

export const loanSimulationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["loan_simulations", userId],
    queryFn: async () =>
      unwrap<LoanSimulation[]>(
        (await supabase
          .from("loan_simulations")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10)) as never,
      ),
  });

export const holdingsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["investment_holdings", userId],
    queryFn: async () =>
      unwrap<Holding[]>(
        (await supabase
          .from("investment_holdings")
          .select("*")
          .eq("user_id", userId)
          .order("instrument")) as never,
      ),
  });

export const documentsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["documents", userId],
    queryFn: async () =>
      unwrap<DocumentRow[]>(
        (await supabase
          .from("documents")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })) as never,
      ),
  });

export const securityEventsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["security_events", userId],
    queryFn: async () =>
      unwrap<SecurityEvent[]>(
        (await supabase
          .from("security_events")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50)) as never,
      ),
  });

export const customerPreferencesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["customer_preferences", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as CustomerPreferences | null;
    },
  });
