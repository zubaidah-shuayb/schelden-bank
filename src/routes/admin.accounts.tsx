import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BalanceDialog, EmptyRow, StatCard, callRpc } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminAccountsQuery, adminProfilesQuery, displayName } from "@/lib/admin-queries";
import { accountTypeLabels, formatDate, formatIban, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/accounts")({
  component: AdminAccountsPage,
});

function AdminAccountsPage() {
  const accounts = useQuery(adminAccountsQuery());
  const profiles = useQuery(adminProfilesQuery());
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");

  const nameFor = (id: string) => displayName((profiles.data ?? []).find((p) => p.id === id));

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (accounts.data ?? [])
      .filter((a) => (status === "all" ? true : a.status === status))
      .filter((a) => (q ? `${a.iban} ${nameFor(a.user_id)}`.toLowerCase().includes(q) : true));
  }, [accounts.data, profiles.data, term, status]);

  const total = (accounts.data ?? []).reduce((s, a) => s + Number(a.balance), 0);

  async function setAccountStatus(id: string, next: string) {
    try {
      await callRpc("admin_set_account_status", { _account_id: id, _status: next, _reason: null });
      toast.success(`Account ${next}.`);
      await qc.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The change was refused.");
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Accounts & balances"
        description="Balances move only through audited credit and debit operations."
        action={
          <BalanceDialog
            accounts={accounts.data ?? []}
            accountsLoading={accounts.isLoading}
            labelFor={(a) => nameFor(a.user_id)}
            trigger={<Button>Manage balance</Button>}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Accounts" value={(accounts.data ?? []).length} />
        <StatCard label="Total balance" value={formatMoney(total)} />
        <StatCard
          label="Frozen or closed"
          value={(accounts.data ?? []).filter((a) => a.status !== "active").length}
        />
      </div>

      <div className="mt-6 mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search accounts"
            placeholder="IBAN or customer"
            className="pl-9"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]" aria-label="Account status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="frozen">Frozen</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-0">
          {accounts.isLoading ? (
            <EmptyRow>Loading accounts…</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow>No accounts match these filters.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <Link
                      to="/admin/customers/$userId"
                      params={{ userId: a.user_id }}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {nameFor(a.user_id)}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {accountTypeLabels[a.account_type] ?? a.account_type} · {formatIban(a.iban)} ·
                      opened {formatDate(a.opened_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge value={a.status} />
                    <span className="text-sm font-semibold">{formatMoney(a.balance)}</span>
                    <BalanceDialog
                      accounts={accounts.data ?? []}
                      accountsLoading={accounts.isLoading}
                      defaultAccountId={a.id}
                      labelFor={(acc) => nameFor(acc.user_id)}
                      trigger={
                        <Button size="sm" variant="outline">
                          Credit / debit
                        </Button>
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAccountStatus(a.id, a.status === "frozen" ? "active" : "frozen")}
                    >
                      {a.status === "frozen" ? "Unfreeze" : "Freeze"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
