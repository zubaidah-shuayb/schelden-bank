import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EmptyRow, StatCard } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminAccountsQuery,
  adminConversationsQuery,
  adminInvestmentsQuery,
  adminLoansQuery,
  adminProfilesQuery,
  adminSavingsQuery,
  adminTransactionsQuery,
} from "@/lib/admin-queries";
import { formatMoney, transactionTypeLabels } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

const ranges = [
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "365", label: "Last 12 months", days: 365 },
  { key: "all", label: "All time", days: 100000 },
] as const;

const creditTypes = new Set(["credit", "deposit", "refund", "interest"]);

function ReportsPage() {
  const [range, setRange] = useState<string>("90");
  const profiles = useQuery(adminProfilesQuery());
  const accounts = useQuery(adminAccountsQuery());
  const transactions = useQuery(adminTransactionsQuery(1000));
  const savings = useQuery(adminSavingsQuery());
  const investments = useQuery(adminInvestmentsQuery());
  const loans = useQuery(adminLoansQuery());
  const conversations = useQuery(adminConversationsQuery());

  const days = ranges.find((r) => r.key === range)?.days ?? 90;
  const since = Date.now() - days * 86400000;
  const inRange = (value: string) => new Date(value).getTime() >= since;

  const tx = useMemo(
    () => (transactions.data ?? []).filter((t) => inRange(t.occurred_at)),
    [transactions.data, range],
  );

  const credits = tx.filter((t) => creditTypes.has(t.type) && t.status === "completed");
  const debits = tx.filter((t) => !creditTypes.has(t.type) && t.status === "completed");
  const creditTotal = credits.reduce((s, t) => s + Number(t.amount), 0);
  const debitTotal = debits.reduce((s, t) => s + Number(t.amount), 0);

  const byType = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const t of tx) {
      const current = map.get(t.type) ?? { count: 0, total: 0 };
      map.set(t.type, { count: current.count + 1, total: current.total + Number(t.amount) });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [tx]);

  const savedTotal = (savings.data ?? []).reduce((s, g) => s + Number(g.saved_amount), 0);
  const investedTotal = (investments.data ?? []).reduce(
    (s, h) => s + Number(h.units) * Number(h.unit_value),
    0,
  );
  const balanceTotal = (accounts.data ?? []).reduce((s, a) => s + Number(a.balance), 0);
  const verified = (profiles.data ?? []).filter((p) => p.verification_status === "verified").length;

  return (
    <div>
      <AdminPageHeader
        title="Reports"
        description="Operational summaries drawn from live banking records."
        action={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[180px]" aria-label="Reporting period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ranges.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={(profiles.data ?? []).length} hint={`${verified} verified`} />
        <StatCard label="Total balances" value={formatMoney(balanceTotal)} hint={`${(accounts.data ?? []).length} accounts`} />
        <StatCard label="Credits in period" value={formatMoney(creditTotal)} hint={`${credits.length} postings`} />
        <StatCard label="Debits in period" value={formatMoney(debitTotal)} hint={`${debits.length} postings`} />
        <StatCard label="Savings held" value={formatMoney(savedTotal)} hint={`${(savings.data ?? []).length} goals`} />
        <StatCard label="Investments" value={formatMoney(investedTotal)} hint={`${(investments.data ?? []).length} holdings`} />
        <StatCard label="Loan calculations" value={(loans.data ?? []).length} />
        <StatCard
          label="Support conversations"
          value={(conversations.data ?? []).length}
          hint={`${(conversations.data ?? []).filter((c) => c.status !== "closed").length} not closed`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Transaction activity by type</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {byType.length === 0 ? (
              <EmptyRow>No transactions in this period.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {byType.map(([type, v]) => (
                  <li key={type} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="text-sm">{transactionTypeLabels[type] ?? type}</span>
                    <span className="text-xs text-muted-foreground">{v.count} postings</span>
                    <span className="text-sm font-semibold">{formatMoney(v.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Verification and risk</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(profiles.data ?? []).length === 0 ? (
              <EmptyRow>No customers registered yet.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {["verified", "pending", "needs_information", "rejected"].map((status) => {
                  const count = (profiles.data ?? []).filter(
                    (p) => p.verification_status === status,
                  ).length;
                  return (
                    <li key={status} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm capitalize">{status.replace(/_/g, " ")}</span>
                      <span className="text-sm font-semibold">{count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
