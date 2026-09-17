import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/format";
import { loanSimulationsQuery } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/loans")({
  component: LoansPage,
});

const ANNUAL_RATE = 4.25;

function LoansPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const saved = useQuery(loanSimulationsQuery(uid));

  const [amount, setAmount] = useState(15000);
  const [term, setTerm] = useState(60);

  const result = useMemo(() => {
    const monthlyRate = ANNUAL_RATE / 100 / 12;
    const monthly =
      monthlyRate === 0
        ? amount / term
        : (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
    const totalRepayment = monthly * term;
    return {
      monthly,
      totalRepayment,
      interest: totalRepayment - amount,
    };
  }, [amount, term]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("loan_simulations").insert({
        user_id: uid,
        amount,
        term_months: term,
        annual_rate: ANNUAL_RATE,
        monthly_payment: Number(result.monthly.toFixed(2)),
        total_repayment: Number(result.totalRepayment.toFixed(2)),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Calculation saved");
      qc.invalidateQueries({ queryKey: ["loan_simulations", uid] });
    },
    onError: () => toast.error("We couldn't save that calculation."),
  });

  return (
    <div>
      <PageHeader
        title="Loan calculator"
        description="See what a loan could cost you each month before you apply."
      />


      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="card-elevated">
          <CardContent className="space-y-8 p-6">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="loan-amount">Amount you'd like to borrow</Label>
                <span className="font-display text-xl font-semibold">{formatMoney(amount)}</span>
              </div>
              <Slider
                id="loan-amount"
                min={1000}
                max={100000}
                step={500}
                value={[amount]}
                onValueChange={([v]) => setAmount(v ?? amount)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatMoney(1000)}</span>
                <span>{formatMoney(100000)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="loan-term">Repayment period</Label>
                <span className="font-display text-xl font-semibold">
                  {term} months
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({(term / 12).toFixed(1)} years)
                  </span>
                </span>
              </div>
              <Slider
                id="loan-term"
                min={12}
                max={120}
                step={6}
                value={[term]}
                onValueChange={([v]) => setTerm(v ?? term)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>12 months</span>
                <span>120 months</span>
              </div>
            </div>

            <p className="rounded-lg bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
              Illustrative annual rate of {ANNUAL_RATE.toFixed(2)}%, fixed for the whole period.
              Figures are indicative and are not an offer of credit.
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="space-y-6 p-6">
            <div>
              <p className="eyebrow">Estimated monthly payment</p>
              <p className="font-display text-4xl font-semibold brand-text">
                {formatMoney(result.monthly)}
              </p>
            </div>
            <div className="rule-line" />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount borrowed</dt>
                <dd className="font-medium">{formatMoney(amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total interest</dt>
                <dd className="font-medium">{formatMoney(result.interest)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total repayment</dt>
                <dd className="font-medium">{formatMoney(result.totalRepayment)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Annual rate</dt>
                <dd className="font-medium">{ANNUAL_RATE.toFixed(2)}%</dd>
              </div>
            </dl>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              <Calculator className="h-4 w-4" />
              {save.isPending ? "Saving…" : "Save this calculation"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {(saved.data ?? []).length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Saved calculations</h2>
          <div className="mt-4 space-y-3">
            {(saved.data ?? []).map((sim) => (
              <Card key={sim.id}>
                <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2 p-4 text-sm">
                  <span className="font-medium">{formatMoney(sim.amount)}</span>
                  <span className="text-muted-foreground">{sim.term_months} months</span>
                  <span className="text-muted-foreground">
                    {Number(sim.annual_rate).toFixed(2)}%
                  </span>
                  <span className="font-medium">
                    {formatMoney(sim.monthly_payment)} / month
                  </span>
                  <span className="text-muted-foreground">
                    {formatMoney(sim.total_repayment)} total
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(sim.created_at)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
