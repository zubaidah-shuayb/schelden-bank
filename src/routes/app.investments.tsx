import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LineChart, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/format";
import { holdingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/app/investments")({
  component: InvestmentsPage,
});

function InvestmentsPage() {
  const { user } = useAuth();
  const holdings = useQuery(holdingsQuery(user!.id));
  const list = holdings.data ?? [];

  const values = list.map((h) => Number(h.units) * Number(h.unit_value));
  const total = values.reduce((sum, v) => sum + v, 0);

  return (
    <div>
      <PageHeader
        title="Investments"
        description="Your portfolio held with Schelden Bank, with holdings, allocation and value."
      />

      {holdings.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No holdings yet"
          description="When the bank adds an investment position to your portfolio, it will appear here."
        />
      ) : (
        <div className="space-y-6">
          <Card className="card-elevated">
            <CardContent className="flex flex-wrap items-end gap-10 p-6">
              <div>
                <p className="eyebrow">Portfolio value</p>
                <p className="font-display text-4xl font-semibold">{formatMoney(total)}</p>
              </div>
              <div>
                <p className="eyebrow">Positions</p>
                <p className="font-display text-2xl text-muted-foreground">{list.length}</p>
              </div>
              <p className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-4 w-4" aria-hidden />
                Values are illustrative and update when the bank revalues a position.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {list.map((holding, index) => {
              const value = values[index] ?? 0;
              const share =
                holding.allocation_percent != null
                  ? Number(holding.allocation_percent)
                  : total > 0
                    ? (value / total) * 100
                    : 0;
              return (
                <Card key={holding.id} className="card-elevated">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-semibold">{holding.instrument}</p>
                        <p className="text-sm text-muted-foreground">
                          {Number(holding.units).toLocaleString("nl-BE")} units ·{" "}
                          {formatMoney(holding.unit_value)} each
                        </p>
                      </div>
                      <p className="font-display text-xl font-semibold">{formatMoney(value)}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Progress value={Math.min(100, share)} />
                      <p className="text-xs text-muted-foreground">
                        {share.toFixed(1)}% of the portfolio · revalued{" "}
                        {formatDateTime(holding.updated_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
