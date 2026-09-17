import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CreditCard,
  LifeBuoy,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { EmptyRow, StatCard } from "@/components/admin/admin-ops";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminAccountsQuery,
  adminAuditLogsQuery,
  adminCardsQuery,
  adminConversationsQuery,
  adminProfilesQuery,
  adminRiskCasesQuery,
  adminTransactionsQuery,
  displayName,
} from "@/lib/admin-queries";
import { formatDateTime, formatMoney, transactionTypeLabels } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: CommandCentre,
});

function CommandCentre() {
  const profiles = useQuery(adminProfilesQuery());
  const accounts = useQuery(adminAccountsQuery());
  const transactions = useQuery(adminTransactionsQuery(100));
  const cards = useQuery(adminCardsQuery());
  const conversations = useQuery(adminConversationsQuery());
  const risks = useQuery(adminRiskCasesQuery());
  const audit = useQuery(adminAuditLogsQuery(10));

  const people = profiles.data ?? [];
  const verified = people.filter((p) => p.verification_status === "verified").length;
  const totalBalance = (accounts.data ?? []).reduce((sum, a) => sum + Number(a.balance), 0);
  const pending = (transactions.data ?? []).filter((t) =>
    ["pending", "processing", "flagged"].includes(t.status),
  );
  const openConversations = (conversations.data ?? []).filter((c) =>
    ["open", "waiting", "in_progress"].includes(c.status),
  );
  const openRisks = (risks.data ?? []).filter((r) => r.state !== "closed");
  const frozenCards = (cards.data ?? []).filter((c) => c.status === "frozen").length;
  const nameFor = (id?: string | null) => displayName(people.find((p) => p.id === id));

  const alerts = [
    ...openRisks.slice(0, 3).map((r) => ({
      id: r.id,
      tone: r.level,
      text: `${r.title} — ${nameFor(r.user_id)}`,
    })),
    ...pending.slice(0, 3).map((t) => ({
      id: t.id,
      tone: t.status,
      text: `${transactionTypeLabels[t.type] ?? t.type} ${formatMoney(t.amount)} awaiting action`,
    })),
    ...people
      .filter((p) => p.verification_status === "pending")
      .slice(0, 3)
      .map((p) => ({ id: p.id, tone: "pending", text: `${displayName(p)} awaiting verification` })),
  ];

  return (
    <div>
      <AdminPageHeader
        title="Command centre"
        description="Live operational picture across customers, money movement, risk and support."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Customers"
          value={people.length}
          hint={`${verified} verified · ${people.length - verified} unverified`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Customer balances"
          value={formatMoney(totalBalance)}
          hint={`${(accounts.data ?? []).length} accounts`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Pending activity"
          value={pending.length}
          hint="Pending, processing or flagged"
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          label="Open support"
          value={openConversations.length}
          hint={`${(conversations.data ?? []).length} conversations total`}
          icon={<LifeBuoy className="h-4 w-4" />}
        />
        <StatCard
          label="Risk cases"
          value={openRisks.length}
          hint={`${(risks.data ?? []).length} recorded`}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Cards"
          value={(cards.data ?? []).length}
          hint={`${frozenCards} frozen`}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          label="Verified rate"
          value={people.length ? `${Math.round((verified / people.length) * 100)}%` : "—"}
          hint="Identity verification"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Transactions"
          value={(transactions.data ?? []).length}
          hint="Most recent 100"
          icon={<Receipt className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <Link to="/admin/transactions" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {(transactions.data ?? []).length === 0 ? (
              <EmptyRow>No transactions have been posted yet.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {(transactions.data ?? []).slice(0, 8).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {nameFor(t.user_id)} · {t.reference_code} · {formatDateTime(t.occurred_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{formatMoney(t.amount)}</p>
                      <StatusBadge value={t.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Important alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <EmptyRow>Nothing needs attention.</EmptyRow>
            ) : (
              <ul className="space-y-3">
                {alerts.map((a) => (
                  <li key={`${a.id}-${a.text}`} className="flex items-start gap-3">
                    <StatusBadge value={a.tone} />
                    <span className="text-sm">{a.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent administrative actions</CardTitle>
          <Link to="/admin/audit" className="text-xs text-primary hover:underline">
            Audit log
          </Link>
        </CardHeader>
        <CardContent>
          {(audit.data ?? []).length === 0 ? (
            <EmptyRow>No administrative actions recorded yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {(audit.data ?? []).map((log) => (
                <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {log.admin_email ?? "Administrator"} · {nameFor(log.target_user)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
