import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Landmark } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { accountTypeLabels, formatDate, formatIban, formatMoney } from "@/lib/format";
import { accountsQuery } from "@/lib/queries";

export const Route = createFileRoute("/app/accounts")({
  component: AccountsPage,
});

const blurbs: Record<string, string> = {
  current: "Your everyday account for salary, payments and card spending.",
  savings: "Set money aside and watch it grow at your own pace.",
  personal_reserve: "A buffer you can draw on when something unexpected comes up.",
};

function AccountsPage() {
  const { user } = useAuth();
  const accounts = useQuery(accountsQuery(user!.id));

  async function copyIban(iban: string) {
    try {
      await navigator.clipboard.writeText(iban);
      toast.success("IBAN copied");
    } catch {
      toast.error("We couldn't copy that. Please select it manually.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Every Schelden Bank account you hold, with balances kept in sync by the bank."
      />

      {accounts.isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : accounts.isError ? (
        <EmptyState
          icon={Landmark}
          title="We couldn't load your accounts"
          description="Please refresh the page or contact support if this keeps happening."
        />
      ) : (accounts.data ?? []).length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No accounts yet"
          description="Your accounts appear here once the bank has opened them for you."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {(accounts.data ?? []).map((account) => (
            <Card key={account.id} className="card-elevated overflow-hidden">
              <div className="brand-gradient px-6 py-5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow text-white/70">
                      {accountTypeLabels[account.account_type]}
                    </p>
                    <p className="mt-2 font-display text-3xl font-semibold">
                      {formatMoney(account.balance, account.currency)}
                    </p>
                  </div>
                  <StatusBadge value={account.status} className="bg-white/15 text-white" />
                </div>
              </div>
              <CardContent className="space-y-4 p-6">
                <p className="text-sm text-muted-foreground">{blurbs[account.account_type]}</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="eyebrow">IBAN</dt>
                    <dd className="mt-1 flex items-center gap-2 text-sm">
                      <span className="truncate">{formatIban(account.iban)}</span>
                      <button
                        type="button"
                        onClick={() => copyIban(account.iban)}
                        aria-label="Copy IBAN"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Available</dt>
                    <dd className="mt-1 text-sm">
                      {formatMoney(account.available_balance, account.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Opened</dt>
                    <dd className="mt-1 text-sm">{formatDate(account.opened_at)}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Currency</dt>
                    <dd className="mt-1 text-sm">{account.currency}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/app/transactions">View transactions</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/app/transfers">Send money</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
