import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { accountTypeLabels, formatDate, formatMoney } from "@/lib/format";
import { accountsQuery, savingsGoalsQuery, type Account, type SavingsGoal } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/savings")({
  component: SavingsPage,
});

function SavingsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const goals = useQuery(savingsGoalsQuery(uid));
  const accounts = useQuery(accountsQuery(uid));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["savings_goals", uid] });
    qc.invalidateQueries({ queryKey: ["accounts", uid] });
    qc.invalidateQueries({ queryKey: ["transactions", uid] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const targetAmount = Number(target);
      if (!name.trim()) throw new Error("Give your goal a name.");
      if (!Number.isFinite(targetAmount) || targetAmount <= 0)
        throw new Error("Enter a target amount above zero.");
      const { error } = await supabase.from("savings_goals").insert({
        user_id: uid,
        name: name.trim(),
        target_amount: targetAmount,
        saved_amount: 0,
        target_date: date || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Savings goal created");
      setOpen(false);
      setName("");
      setTarget("");
      setDate("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({
      goalId,
      accountId,
      amount,
      direction,
    }: {
      goalId: string;
      accountId: string;
      amount: number;
      direction: "in" | "out";
    }) => {
      const { error } = await supabase.rpc(
        direction === "in" ? "fund_savings_goal" : "withdraw_savings_goal",
        { _goal_id: goalId, _account_id: accountId, _amount: amount },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.direction === "in" ? "Money moved into your goal" : "Money returned to your account",
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Goal removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = goals.data ?? [];
  const accountList = accounts.data ?? [];
  const totalTarget = list.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalSaved = list.reduce((sum, g) => sum + Number(g.saved_amount), 0);


  return (
    <div>
      <PageHeader
        title="Savings goals"
        description="Plan what you're saving for and follow your progress month by month."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New goal
          </Button>
        }
      />

      {list.length > 0 ? (
        <Card className="mb-6 card-elevated">
          <CardContent className="flex flex-wrap items-end gap-8 p-6">
            <div>
              <p className="eyebrow">Saved so far</p>
              <p className="font-display text-3xl font-semibold">{formatMoney(totalSaved)}</p>
            </div>
            <div>
              <p className="eyebrow">Across all goals</p>
              <p className="font-display text-xl text-muted-foreground">
                {formatMoney(totalTarget)} target
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {goals.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No savings goals yet"
          description="Create your first goal — a holiday, a deposit, a rainy-day buffer — and track it here."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Create a goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              accounts={accountList}
              busy={move.isPending}
              onMove={(accountId, amount, direction) =>
                move.mutate({ goalId: goal.id, accountId, amount, direction })
              }
              onRemove={() => remove.mutate(goal.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New savings goal</DialogTitle>
            <DialogDescription>
              Set your target now. You can move money in from one of your accounts once the goal
              exists.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Goal name</Label>
              <Input
                id="goal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Holiday in Italy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target amount (EUR)</Label>
              <Input
                id="goal-target"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="2500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-date">Target date (optional)</Label>
              <Input
                id="goal-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({
  goal,
  accounts,
  busy,
  onMove,
  onRemove,
}: {
  goal: SavingsGoal;
  accounts: Account[];
  busy: boolean;
  onMove: (accountId: string, amount: number, direction: "in" | "out") => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState("");
  const [accountId, setAccountId] = useState("");
  const targetAmount = Number(goal.target_amount);
  const savedAmount = Number(goal.saved_amount);
  const percent = targetAmount > 0 ? Math.min(100, (savedAmount / targetAmount) * 100) : 0;
  const selected = accounts.find((a) => a.id === accountId) ?? accounts[0];

  function submit(direction: "in" | "out") {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) {
      toast.error("Enter an amount above zero.");
      return;
    }
    if (!selected) {
      toast.error("You don't have an account to move money from yet.");
      return;
    }
    if (direction === "in" && Number(selected.available_balance ?? selected.balance) < next) {
      toast.error("Not enough money in that account.");
      return;
    }
    if (direction === "out" && savedAmount < next) {
      toast.error("This goal doesn't hold that much.");
      return;
    }
    onMove(selected.id, next, direction);
    setValue("");
  }

  return (
    <Card className="card-elevated">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold">{goal.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatMoney(savedAmount)} of {formatMoney(targetAmount)}
              {goal.target_date ? ` · by ${formatDate(goal.target_date)}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${goal.name}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <Progress value={percent} />
          <p className="text-xs text-muted-foreground">{Math.round(percent)}% of the way there</p>
        </div>

        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            You'll be able to move money into this goal once an account with a balance is open.
          </p>
        ) : (
          <div className="space-y-2">
            <Select value={selected?.id ?? ""} onValueChange={setAccountId}>
              <SelectTrigger aria-label="Account" className="text-sm">
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {accountTypeLabels[a.account_type]} ·{" "}
                    {formatMoney(a.available_balance ?? a.balance, a.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`amount-${goal.id}`} className="text-xs">
                  Amount (EUR)
                </Label>
                <Input
                  id={`amount-${goal.id}`}
                  inputMode="decimal"
                  value={value}
                  placeholder="0.00"
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <Button disabled={busy} onClick={() => submit("in")}>
                Add money
              </Button>
              <Button
                variant="outline"
                disabled={busy || savedAmount <= 0}
                onClick={() => submit("out")}
              >
                Withdraw
              </Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
