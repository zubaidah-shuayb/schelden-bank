import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Receipt, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import {
  formatDateTime,
  formatMoney,
  isCredit,
  relativeDay,
  transactionTypeLabels,
} from "@/lib/format";
import { accountsQuery, transactionsQuery } from "@/lib/queries";

export const Route = createFileRoute("/app/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const transactions = useQuery(transactionsQuery(uid));
  const accounts = useQuery(accountsQuery(uid));

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [account, setAccount] = useState("all");

  const filtered = useMemo(() => {
    return (transactions.data ?? []).filter((tx) => {
      if (status !== "all" && tx.status !== status) return false;
      if (account !== "all" && tx.account_id !== account) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          tx.description.toLowerCase().includes(q) ||
          tx.reference_code.toLowerCase().includes(q) ||
          (tx.reference ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions.data, status, account, search]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const tx of filtered) {
      const key = relativeDay(tx.occurred_at);
      map.set(key, [...(map.get(key) ?? []), tx]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="A timeline of every movement on your accounts, newest first."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_200px]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description or reference"
            aria-label="Search transactions"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["completed", "pending", "processing", "failed", "reversed", "cancelled", "flagged"].map(
              (s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select value={account} onValueChange={setAccount}>
          <SelectTrigger aria-label="Filter by account">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {(accounts.data ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.iban.slice(-6)} · {a.account_type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {transactions.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={
            (transactions.data ?? []).length === 0
              ? "No transactions yet"
              : "Nothing matches those filters"
          }
          description={
            (transactions.data ?? []).length === 0
              ? "Your account activity will appear here as soon as it happens."
              : "Try a different search term, status or account."
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <section key={day}>
              <h2 className="eyebrow mb-2">{day}</h2>
              <Card className="card-elevated">
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {items.map((tx) => {
                      const credit = isCredit(tx.type, Number(tx.amount));
                      return (
                        <li key={tx.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                          <span
                            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                              credit ? "bg-emerald/10 text-emerald" : "bg-muted text-foreground"
                            }`}
                          >
                            {credit ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{tx.description}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {transactionTypeLabels[tx.type] ?? tx.type} ·{" "}
                              {formatDateTime(tx.occurred_at)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Ref {tx.reference_code}
                              {tx.reversal_of ? " · reversal" : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold ${credit ? "text-emerald" : ""}`}
                            >
                              {credit ? "+" : "−"}
                              {formatMoney(Math.abs(Number(tx.amount)), tx.currency)}
                            </p>
                            <StatusBadge value={tx.status} className="mt-1" />
                            {tx.balance_after != null ? (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Balance {formatMoney(tx.balance_after, tx.currency)}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
