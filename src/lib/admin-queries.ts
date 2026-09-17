import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Account, Card, Profile, Transaction } from "@/lib/queries";

export type AdminTransaction = Transaction & {
  user_id: string;
  balance_before: number | null;
  created_by_admin: string | null;
};

export type RiskCase = {
  id: string;
  user_id: string | null;
  transaction_id: string | null;
  level: string;
  title: string;
  detail: string | null;
  state: string;
  notes: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  target_user: string | null;
  target_table: string | null;
  target_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
};

export type SupportConversation = {
  id: string;
  user_id: string;
  subject: string | null;
  status: string;
  priority: string;
  internal_notes: string | null;
  assigned_admin: string | null;
  user_typing_at: string | null;
  admin_typing_at: string | null;
  last_activity_at: string;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  body: string | null;
  attachment_path: string | null;
  attachment_type: string | null;
  read_at: string | null;
  created_at: string;
};

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export const adminProfilesQuery = () =>
  queryOptions({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const profiles = unwrap<Profile[]>(
        (await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })) as never,
      );
      const { data: admins } = await supabase.from("admin_users").select("user_id");
      const adminIds = new Set((admins ?? []).map((a: { user_id: string }) => a.user_id));
      // Administrator accounts are staff, not customers: keep them out of customer views.
      return profiles.filter((p) => !adminIds.has(p.id));
    },
  });

export const adminAccountsQuery = () =>
  queryOptions({
    queryKey: ["admin", "accounts"],
    queryFn: async () =>
      unwrap<Account[]>(
        (await supabase
          .from("accounts")
          .select("*")
          .order("opened_at", { ascending: false })) as never,
      ),
  });

export const adminTransactionsQuery = (limit = 300) =>
  queryOptions({
    queryKey: ["admin", "transactions", limit],
    queryFn: async () =>
      unwrap<AdminTransaction[]>(
        (await supabase
          .from("transactions")
          .select("*")
          .order("occurred_at", { ascending: false })
          .limit(limit)) as never,
      ),
  });

export const adminCardsQuery = () =>
  queryOptions({
    queryKey: ["admin", "cards"],
    queryFn: async () =>
      unwrap<(Card & { user_id: string })[]>(
        (await supabase
          .from("cards")
          .select("*")
          .order("issued_at", { ascending: false })) as never,
      ),
  });

export const adminRiskCasesQuery = () =>
  queryOptions({
    queryKey: ["admin", "risk_cases"],
    queryFn: async () =>
      unwrap<RiskCase[]>(
        (await supabase
          .from("risk_cases")
          .select("*")
          .order("created_at", { ascending: false })) as never,
      ),
  });

export const adminAuditLogsQuery = (limit = 300) =>
  queryOptions({
    queryKey: ["admin", "audit_logs", limit],
    queryFn: async () =>
      unwrap<AuditLog[]>(
        (await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit)) as never,
      ),
  });

export const adminConversationsQuery = () =>
  queryOptions({
    queryKey: ["admin", "support_conversations"],
    queryFn: async () =>
      unwrap<SupportConversation[]>(
        (await supabase
          .from("support_conversations")
          .select("*")
          .order("last_activity_at", { ascending: false })) as never,
      ),
  });

export const adminDocumentsQuery = () =>
  queryOptions({
    queryKey: ["admin", "documents"],
    queryFn: async () =>
      unwrap<
        {
          id: string;
          user_id: string;
          title: string;
          category: string;
          storage_path: string | null;
          created_at: string;
        }[]
      >(
        (await supabase
          .from("documents")
          .select("*")
          .order("created_at", { ascending: false })) as never,
      ),
  });

export const adminNotificationsQuery = (limit = 200) =>
  queryOptions({
    queryKey: ["admin", "notifications", limit],
    queryFn: async () =>
      unwrap<
        {
          id: string;
          user_id: string;
          category: string;
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        }[]
      >(
        (await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit)) as never,
      ),
  });

export const adminSecurityEventsQuery = (limit = 200) =>
  queryOptions({
    queryKey: ["admin", "security_events", limit],
    queryFn: async () =>
      unwrap<
        {
          id: string;
          user_id: string;
          event_type: string;
          description: string;
          risk: string;
          created_at: string;
        }[]
      >(
        (await supabase
          .from("security_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit)) as never,
      ),
  });

export const adminSavingsQuery = () =>
  queryOptions({
    queryKey: ["admin", "savings_goals"],
    queryFn: async () =>
      unwrap<{ id: string; user_id: string; name: string; target_amount: number; saved_amount: number }[]>(
        (await supabase.from("savings_goals").select("*")) as never,
      ),
  });

export const adminInvestmentsQuery = () =>
  queryOptions({
    queryKey: ["admin", "investment_holdings"],
    queryFn: async () =>
      unwrap<{ id: string; user_id: string; instrument: string; units: number; unit_value: number }[]>(
        (await supabase.from("investment_holdings").select("*")) as never,
      ),
  });

export const adminLoansQuery = () =>
  queryOptions({
    queryKey: ["admin", "loan_simulations"],
    queryFn: async () =>
      unwrap<
        {
          id: string;
          user_id: string;
          amount: number;
          term_months: number;
          monthly_payment: number;
          created_at: string;
        }[]
      >((await supabase.from("loan_simulations").select("*")) as never),
  });

export function displayName(profile?: Partial<Profile> | null) {
  if (!profile) return "Unknown customer";
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return name || profile.email || "Unnamed customer";
}
