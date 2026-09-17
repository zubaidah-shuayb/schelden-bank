import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

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
import { accountTypeLabels, formatIban, formatMoney } from "@/lib/format";
import type { Account } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

/** Every financial mutation goes through a security-definer database function.
 *  Nothing here writes a balance column directly. */
/** Reads a money amount the way people actually type it: "1 000", "1.000,50",
 *  "€1,250.00", "2,5". Returns NaN when there is no usable number. */
export function parseAmount(input: string): number {
  const cleaned = (input ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return Number.NaN;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalised = cleaned;
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal point.
    normalised =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = cleaned.length - lastComma - 1;
    normalised =
      cleaned.indexOf(",") === lastComma && decimals > 0 && decimals <= 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
  }
  const value = Number(normalised);
  return Number.isFinite(value) ? value : Number.NaN;
}

export async function callRpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="card-elevated">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

type BalanceDialogProps = {
  accounts: Account[];
  accountsLoading?: boolean;
  defaultAccountId?: string;
  trigger: ReactNode;
  /** Optional label for each account row, e.g. the customer's name. */
  labelFor?: (account: Account) => string;
};

type AccountPickerProps = {
  accounts: Account[];
  accountId: string;
  onAccountIdChange: (accountId: string) => void;
  loading?: boolean;
  labelFor?: ((account: Account) => string) | undefined;
};

export function AccountPicker({
  accounts,
  accountId,
  onAccountIdChange,
  loading = false,
  labelFor,
}: AccountPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const selectedAccount = accounts.find((item) => item.id === accountId);

  if (loading) {
    return (
      <div className="flex min-h-11 items-center justify-center rounded-md border border-input text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading accounts…
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex min-h-11 items-center justify-center rounded-md border border-input px-4 text-center text-sm text-muted-foreground">
        No customer accounts are available.
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        aria-haspopup="listbox"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="grid h-auto min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left"
      >
        <span className="min-w-0">
          {selectedAccount ? (
            <>
              <span className="block truncate font-medium">
                {labelFor ? labelFor(selectedAccount) : (accountTypeLabels[selectedAccount.account_type] ?? selectedAccount.account_type)}
              </span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {accountTypeLabels[selectedAccount.account_type] ?? selectedAccount.account_type} · {formatIban(selectedAccount.iban)}
              </span>
            </>
          ) : (
            <span className="font-normal text-muted-foreground">Select an account</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </Button>

      {expanded ? (
        <ul
          role="listbox"
          aria-label="Choose a customer account"
          className="mt-2 max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-input bg-popover shadow-md"
        >
          {accounts.map((account) => {
            const selected = account.id === accountId;
            return (
              <li key={account.id}>
                <Button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onAccountIdChange(account.id);
                    setExpanded(false);
                  }}
                  variant="ghost"
                  className={`grid h-auto min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none px-3 py-3 text-left whitespace-normal ${
                    selected ? "bg-primary/10 hover:bg-primary/10" : "hover:bg-muted/60"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block break-words font-medium">
                      {labelFor ? labelFor(account) : (accountTypeLabels[account.account_type] ?? account.account_type)}
                    </span>
                    <span className="mt-1 block break-all text-xs font-normal text-muted-foreground">
                      {accountTypeLabels[account.account_type] ?? account.account_type} · {formatIban(account.iban)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">
                    {formatMoney(account.balance, account.currency)}
                    {selected ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Credit or debit an account with a reason, reference and a confirmation step
 *  showing the balance before and the balance that will result. */
export function BalanceDialog({
  accounts,
  accountsLoading = false,
  defaultAccountId,
  trigger,
  labelFor,
}: BalanceDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(defaultAccountId ?? accounts[0]?.id ?? "");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (defaultAccountId && accounts.some((item) => item.id === defaultAccountId)) {
      setAccountId(defaultAccountId);
      return;
    }
    if (!accounts.some((item) => item.id === accountId)) {
      setAccountId(accounts[0]?.id ?? "");
    }
  }, [accountId, accounts, defaultAccountId]);

  const account = accounts.find((a) => a.id === accountId);
  const numeric = parseAmount(amount);
  const valid = account && Number.isFinite(numeric) && numeric > 0 && reason.trim().length > 2;
  const before = Number(account?.balance ?? 0);
  const after = direction === "credit" ? before + numeric : before - numeric;

  function review() {
    if (!account) {
      toast.error("Select an account before continuing.");
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Enter a reason using at least 3 characters.");
      return;
    }
    setConfirming(true);
  }

  async function execute() {
    if (!valid || !account) return;
    setWorking(true);
    try {
      await callRpc(direction === "credit" ? "admin_credit_account" : "admin_debit_account", {
        _account_id: account.id,
        _amount: numeric,
        _reason: reason.trim(),
        _reference: reference.trim() || null,
      });
      toast.success(
        `${direction === "credit" ? "Credited" : "Debited"} ${formatMoney(numeric)} — recorded and audited.`,
      );
      await qc.invalidateQueries();
      setOpen(false);
      setConfirming(false);
      setAmount("");
      setReason("");
      setReference("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The operation was refused.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirming(false);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{confirming ? "Confirm balance movement" : "Manage balance"}</DialogTitle>
          <DialogDescription>
            {confirming
              ? "This posts an auditable transaction. It cannot be edited afterwards, only reversed."
              : "Credits and debits post a transaction through the protected banking function."}
          </DialogDescription>
        </DialogHeader>

        {confirming ? (
          <dl className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <Row label="Account" value={`${accountTypeLabels[account?.account_type ?? ""] ?? ""} · ${account?.iban ?? ""}`} />
            <Row label="Operation" value={direction === "credit" ? "Credit" : "Debit"} />
            <Row label="Amount" value={formatMoney(numeric)} />
            <Row label="Balance before" value={formatMoney(before)} />
            <Row label="Balance after" value={formatMoney(after)} />
            <Row label="Reason" value={reason} />
            {reference ? <Row label="Reference" value={reference} /> : null}
          </dl>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account</Label>
              <AccountPicker
                accounts={accounts}
                accountId={accountId}
                onAccountIdChange={setAccountId}
                loading={accountsLoading}
                labelFor={labelFor}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bd-direction">Operation</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as "credit" | "debit")}>
                <SelectTrigger id="bd-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit — money in</SelectItem>
                  <SelectItem value="debit">Debit — money out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bd-amount">Amount (EUR)</Label>
              <Input
                id="bd-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bd-reason">Reason</Label>
              <Textarea
                id="bd-reason"
                rows={2}
                placeholder="Why is this movement being posted?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bd-reference">Reference (optional)</Label>
              <Input
                id="bd-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            {account ? (
              <p className="text-xs text-muted-foreground">
                Current balance {formatMoney(before)}.
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2">
          {confirming ? (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={working}>
                Back
              </Button>
              <Button onClick={execute} disabled={working}>
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Post {direction}
              </Button>
            </>
          ) : (
            <Button onClick={review} disabled={accountsLoading || accounts.length === 0}>
              Review
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium break-all">{value}</dd>
    </div>
  );
}
