import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AccountPicker, EmptyRow, callRpc, parseAmount } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  adminAccountsQuery,
  adminProfilesQuery,
  adminTransactionsQuery,
  displayName,
  type AdminTransaction,
} from "@/lib/admin-queries";
import {
  accountTypeLabels,
  formatDateTime,
  formatIban,
  formatMoney,
  transactionTypeLabels,
} from "@/lib/format";

export const Route = createFileRoute("/admin/transactions")({
  component: AdminTransactionsPage,
});

const createTypes = [
  "credit",
  "debit",
  "deposit",
  "withdrawal",
  "refund",
  "adjustment",
  "correction",
  "fee",
  "interest",
] as const;

function AdminTransactionsPage() {
  const transactions = useQuery(adminTransactionsQuery(500));
  const accounts = useQuery(adminAccountsQuery());
  const profiles = useQuery(adminProfilesQuery());
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<AdminTransaction | null>(null);

  const nameFor = (id?: string | null) =>
    displayName((profiles.data ?? []).find((p) => p.id === id));
  const accountFor = (id: string) => (accounts.data ?? []).find((a) => a.id === id);

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (transactions.data ?? [])
      .filter((t) => (status === "all" ? true : t.status === status))
      .filter((t) => (type === "all" ? true : t.type === type))
      .filter((t) =>
        q
          ? [t.reference_code, t.description, t.reference, nameFor(t.user_id)]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true,
      );
  }, [transactions.data, term, status, type, profiles.data]);

  return (
    <div>
      <AdminPageHeader
        title="Transactions"
        description="Every posting runs through the protected banking functions and is audited."
        action={<CreateTransactionDialog />}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search transactions"
            placeholder="Reference, description or customer"
            className="pl-9"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]" aria-label="Status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["pending", "processing", "completed", "failed", "reversed", "cancelled", "flagged"].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[170px]" aria-label="Type filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.keys(transactionTypeLabels).map((t) => (
              <SelectItem key={t} value={t}>
                {transactionTypeLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-0">
          {transactions.isLoading ? (
            <EmptyRow>Loading transactions…</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow>No transactions match these filters.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(t)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {nameFor(t.user_id)} · {t.reference_code} · {formatDateTime(t.occurred_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground capitalize">
                        {transactionTypeLabels[t.type] ?? t.type}
                      </span>
                      <StatusBadge value={t.status} />
                      <span className="text-sm font-semibold">{formatMoney(t.amount)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <TransactionDetail
        transaction={selected}
        onClose={() => setSelected(null)}
        customerName={selected ? nameFor(selected.user_id) : ""}
        accountLabel={
          selected
            ? (() => {
                const a = accountFor(selected.account_id);
                return a ? `${accountTypeLabels[a.account_type] ?? a.account_type} · ${formatIban(a.iban)}` : "—";
              })()
            : ""
        }
      />
    </div>
  );
}

function TransactionDetail({
  transaction,
  onClose,
  customerName,
  accountLabel,
}: {
  transaction: AdminTransaction | null;
  onClose: () => void;
  customerName: string;
  accountLabel: string;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  const reversible =
    transaction &&
    transaction.status === "completed" &&
    !transaction.reversal_of &&
    transaction.type !== "reversal";

  return (
    <Dialog open={!!transaction} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction details</DialogTitle>
          <DialogDescription>{transaction?.reference_code}</DialogDescription>
        </DialogHeader>
        {transaction ? (
          <dl className="space-y-2 text-sm">
            <Row label="Customer" value={customerName} />
            <Row label="Account" value={accountLabel} />
            <Row label="Description" value={transaction.description} />
            <Row label="Type" value={transactionTypeLabels[transaction.type] ?? transaction.type} />
            <Row label="Status" value={transaction.status} />
            <Row label="Amount" value={formatMoney(transaction.amount)} />
            <Row label="Balance before" value={formatMoney(transaction.balance_before ?? 0)} />
            <Row label="Balance after" value={formatMoney(transaction.balance_after ?? 0)} />
            <Row label="Reference" value={transaction.reference ?? "—"} />
            <Row label="Reason" value={transaction.reason ?? "—"} />
            <Row label="Created by" value={transaction.created_by_admin ? "Operations" : "System"} />
            <Row label="Date" value={formatDateTime(transaction.occurred_at)} />
            {transaction.reversal_of ? <Row label="Reverses" value={transaction.reversal_of} /> : null}
          </dl>
        ) : null}

        {reversible ? (
          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="rev-reason">Reversal reason</Label>
            <Textarea id="rev-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              The original entry is kept. A reversal can only be posted once.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {reversible ? (
            <Button
              variant="destructive"
              disabled={working || reason.trim().length < 3}
              onClick={async () => {
                setWorking(true);
                try {
                  if (!transaction) return;
                  await callRpc("admin_reverse_transaction", {
                    _transaction_id: transaction.id,
                    _reason: reason.trim(),
                  });
                  toast.success("Transaction reversed and audited.");
                  await qc.invalidateQueries();
                  onClose();
                  setReason("");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "The reversal was refused.");
                } finally {
                  setWorking(false);
                }
              }}
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Reverse transaction
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateTransactionDialog() {
  const qc = useQueryClient();
  const accounts = useQuery(adminAccountsQuery());
  const profiles = useQuery(adminProfilesQuery());
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState<string>("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("completed");
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  const numeric = parseAmount(amount);
  const valid = accountId && Number.isFinite(numeric) && numeric > 0 && description.trim().length > 2;

  async function createTransaction() {
    if (!accountId) {
      toast.error("Select an account before continuing.");
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    if (description.trim().length < 3) {
      toast.error("Enter a description using at least 3 characters.");
      return;
    }

    setWorking(true);
    try {
      await callRpc("admin_create_transaction", {
        _account_id: accountId,
        _type: type,
        _amount: numeric,
        _description: description.trim(),
        _reference: reference.trim() || null,
        _status: status,
        _reason: reason.trim() || null,
      });
      toast.success("Transaction posted.");
      await qc.invalidateQueries();
      setOpen(false);
      setAccountId("");
      setAmount("");
      setDescription("");
      setReference("");
      setReason("");
    } catch {
      toast.error("The transaction could not be posted. Check the details and try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create transaction</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a transaction</DialogTitle>
          <DialogDescription>
            Posted through the protected banking function with a full audit record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Account</Label>
            <AccountPicker
              accounts={accounts.data ?? []}
              accountId={accountId}
              onAccountIdChange={setAccountId}
              loading={accounts.isPending}
              labelFor={(account) =>
                displayName((profiles.data ?? []).find((profile) => profile.id === account.user_id))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ct-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="ct-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {createTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {transactionTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="ct-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["completed", "pending", "processing", "failed", "flagged"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-amount">Amount (EUR)</Label>
            <Input
              id="ct-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-desc">Description</Label>
            <Input id="ct-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-ref">Reference (optional)</Label>
            <Input id="ct-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-reason">Reason</Label>
            <Textarea id="ct-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Only a completed posting moves the balance. Pending and flagged entries are recorded
            without changing money.
          </p>
        </div>

        <DialogFooter>
          <Button
            disabled={working || accounts.isPending || (accounts.data ?? []).length === 0}
            onClick={createTransaction}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Post transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium break-all capitalize">{value}</dd>
    </div>
  );
}
