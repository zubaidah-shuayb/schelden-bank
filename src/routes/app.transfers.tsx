import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import {
  TransferProcessingOverlay,
  makeTransferReference,
  type TransferDetails,
} from "@/components/app/transfer-processing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/lib/auth";
import { accountTypeLabels, formatIban, formatMoney } from "@/lib/format";
import { accountsQuery, beneficiariesQuery } from "@/lib/queries";

export const Route = createFileRoute("/app/transfers")({
  component: TransfersPage,
});

function TransfersPage() {
  const { user } = useAuth();
  const uid = user!.id;
  
  const accounts = useQuery(accountsQuery(uid));
  const beneficiaries = useQuery(beneficiariesQuery(uid));

  const [fromAccount, setFromAccount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [iban, setIban] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [submitting] = useState(false);
  const [processing, setProcessing] = useState<{
    reference: string;
    details: TransferDetails;
  } | null>(null);

  function onFromAccountChange(value: string) {
    setFromAccountId(value);
    const account = (accounts.data ?? []).find((a) => a.id === value);
    if (account) setFromAccount(formatIban(account.iban));
  }

  function onBeneficiaryChange(value: string) {
    setBeneficiary(value);
    const match = (beneficiaries.data ?? []).find((b) => b.id === value);
    if (match) {
      setIban(match.iban);
      setName(match.name);
      if (match.reference) setReference(match.reference);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (processing) return;


    // Validate before anything else, so an input mistake is never reported as
    // a payment problem.
    const value = Number(amount);
    if (fromAccount.replace(/\s/g, "").length < 8) {
      toast.error("Enter the account the money should leave from.");
      return;
    }
    if (iban.replace(/\s/g, "").length < 8) {
      toast.error("Enter a valid recipient account number.");
      return;
    }
    if (!name.trim()) {
      toast.error("Enter the recipient's name.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }

    // Transient UI state only — no balances, transactions or records are written.
    setProcessing({
      reference: makeTransferReference(),
      details: {
        amount: value,
        recipientName: name.trim(),
        recipientIban: iban,
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Transfers"
        description="Send money to a saved beneficiary or a new Belgian or SEPA IBAN."
      />

      <div className="grid gap-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">New transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="from">From account number</Label>
                <Input
                  id="from"
                  required
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value.toUpperCase())}
                  placeholder="0000 0000 0000 0000"
                  inputMode="text"
                  autoComplete="off"
                />
                {(accounts.data ?? []).length > 0 ? (
                  <Select value={fromAccountId} onValueChange={onFromAccountChange}>
                    <SelectTrigger id="from-saved">
                      <SelectValue placeholder="Or choose one of your accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accounts.data ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {accountTypeLabels[a.account_type]} · {formatIban(a.iban)} ·{" "}
                          {formatMoney(a.balance, a.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>


              {(beneficiaries.data ?? []).length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="beneficiary">Saved beneficiary</Label>
                  <Select value={beneficiary} onValueChange={onBeneficiaryChange}>
                    <SelectTrigger id="beneficiary">
                      <SelectValue placeholder="Optional — pick someone you've paid before" />
                    </SelectTrigger>
                    <SelectContent>
                      {(beneficiaries.data ?? []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Recipient name</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Lotte Van Damme"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">Recipient IBAN</Label>
                  <Input
                    id="iban"
                    required
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (EUR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Rent, invoice number…"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message to recipient</Label>
                <Textarea id="message" rows={3} placeholder="Optional" />
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={submitting || !!processing}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {submitting ? "Processing transfer…" : "Review and send"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>

      {processing ? (
        <TransferProcessingOverlay
          details={processing.details}
          reference={processing.reference}
          onClose={() => setProcessing(null)}
        />
      ) : null}
    </div>
  );
}
