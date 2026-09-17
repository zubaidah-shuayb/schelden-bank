import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Bell,
  Calculator,
  CreditCard,
  FileText,
  LineChart as LineChartIcon,
  PiggyBank,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/app/app-shell";
import { LogoMark } from "@/components/brand/logo";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import {
  accountTypeLabels,
  formatIban,
  formatMoney,
  isCredit,
  relativeDay,
  transactionTypeLabels,
} from "@/lib/format";
import {
  accountsQuery,
  cardsQuery,
  profileQuery,
  savingsGoalsQuery,
  transactionsQuery,
  type Profile,
  type Transaction,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

const quickActions = [
  { to: "/app/transfers", label: "Transfer", icon: ArrowUpRight },
  { to: "/app/beneficiaries", label: "Beneficiaries", icon: Users },
  { to: "/app/documents", label: "Statements", icon: FileText },
  { to: "/app/cards", label: "Cards", icon: CreditCard },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/transfers", label: "Deposit", icon: ArrowDownToLine },
  { to: "/app/transfers", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/app/investments", label: "Investments", icon: LineChartIcon },
  { to: "/app/loans", label: "Loans", icon: Calculator },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

type Range = "month" | "6m" | "year";

const rangeLabels: Record<Range, string> = {
  month: "This month",
  "6m": "Last 6 months",
  year: "Last year",
};

function rangeStart(range: Range) {
  const now = new Date();
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "6m") return new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return new Date(now.getFullYear(), now.getMonth() - 11, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const parts = key.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(y, m - 1, 1));
}

function profileCompletion(profile: Profile | null | undefined) {
  if (!profile) return 0;
  const fields = [
    profile.first_name,
    profile.last_name,
    profile.email,
    profile.phone,
    profile.date_of_birth,
    profile.nationality,
    profile.address_street,
    profile.address_postal_code,
    profile.address_city,
    profile.address_country,
    profile.avatar_path,
  ];
  const filled = fields.filter((f) => !!f && String(f).trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function DashboardPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const profile = useQuery(profileQuery(uid));
  const accounts = useQuery(accountsQuery(uid));
  const transactions = useQuery(transactionsQuery(uid, 500));
  const cards = useQuery(cardsQuery(uid));
  const savings = useQuery(savingsGoalsQuery(uid));
  const [range, setRange] = useState<Range>("6m");

  const total = (accounts.data ?? []).reduce((sum, a) => sum + Number(a.balance), 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = profile.data?.first_name ?? "";

  const txs = useMemo<Transaction[]>(() => transactions.data ?? [], [transactions.data]);
  const completed = useMemo(() => txs.filter((t) => t.status === "completed"), [txs]);

  const insights = useMemo(() => {
    const now = new Date();
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let spendThis = 0;
    let spendPrev = 0;
    let incomeThis = 0;
    for (const t of completed) {
      const when = new Date(t.occurred_at);
      const amount = Math.abs(Number(t.amount));
      const credit = isCredit(t.type, Number(t.amount));
      if (when >= startThis) {
        if (credit) incomeThis += amount;
        else spendThis += amount;
      } else if (when >= startPrev) {
        if (!credit) spendPrev += amount;
      }
    }
    const pending = txs.filter((t) => t.status === "pending");
    const pendingTotal = pending.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const trend = spendPrev > 0 ? ((spendThis - spendPrev) / spendPrev) * 100 : null;
    const saved = (savings.data ?? []).reduce((s, g) => s + Number(g.saved_amount), 0);
    return {
      spendThis,
      spendPrev,
      incomeThis,
      trend,
      netThis: incomeThis - spendThis,
      pendingCount: pending.length,
      pendingTotal,
      saved,
      completion: profileCompletion(profile.data),
    };
  }, [completed, txs, savings.data, profile.data]);

  const analytics = useMemo(() => {
    const from = rangeStart(range);
    const scoped = completed.filter((t) => new Date(t.occurred_at) >= from);

    const buckets = new Map<string, { income: number; expense: number }>();
    const months = range === "month" ? 1 : range === "6m" ? 6 : 12;
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      buckets.set(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)), {
        income: 0,
        expense: 0,
      });
    }
    const categories = new Map<string, number>();

    for (const t of scoped) {
      const key = monthKey(new Date(t.occurred_at));
      const bucket = buckets.get(key);
      const amount = Math.abs(Number(t.amount));
      const credit = isCredit(t.type, Number(t.amount));
      if (bucket) {
        if (credit) bucket.income += amount;
        else bucket.expense += amount;
      }
      if (!credit) {
        const label = transactionTypeLabels[t.type] ?? "Other";
        categories.set(label, (categories.get(label) ?? 0) + amount);
      }
    }

    let running = 0;
    const series = Array.from(buckets.entries()).map(([key, value]) => {
      running += value.income - value.expense;
      return {
        month: monthLabel(key),
        income: Math.round(value.income * 100) / 100,
        expense: Math.round(value.expense * 100) / 100,
        net: Math.round((value.income - value.expense) * 100) / 100,
        cumulative: Math.round(running * 100) / 100,
      };
    });

    const categoryData = Array.from(categories.entries())
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return { series, categoryData, count: scoped.length };
  }, [completed, range]);

  const pieColors = [
    "var(--emerald)",
    "var(--primary)",
    "var(--accent)",
    "color-mix(in oklab, var(--emerald) 60%, var(--background))",
    "color-mix(in oklab, var(--primary) 55%, var(--background))",
    "color-mix(in oklab, var(--accent) 50%, var(--background))",
  ];

  const loading = transactions.isLoading || accounts.isLoading;
  const hasActivity = analytics.count > 0;

  return (
    <div className="space-y-8">
      <PageHeader title={`${greeting}${name ? `, ${name}` : ""}`} />


      {/* Balance + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card-elevated brand-gradient relative aspect-[8/5] max-h-72 w-full overflow-hidden rounded-2xl text-white shadow-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.14)_45%,transparent_60%)]" />
            <LogoMark className="pointer-events-none absolute -top-12 -right-10 h-56 w-56 opacity-[0.08]" />

            <div className="relative flex h-full flex-col justify-between p-5 sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-sm font-semibold tracking-[0.22em] uppercase">
                    Schelden Bank
                  </p>
                  <p className="mt-0.5 text-[10px] tracking-[0.3em] text-white/60 uppercase">
                    Total balance
                  </p>
                </div>
                <Wifi className="h-5 w-5 rotate-90 text-white/80" />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-12 rounded-md border border-amber-200/60 bg-gradient-to-br from-amber-100 via-amber-300 to-amber-200 shadow-inner">
                  <div className="mx-auto mt-1.5 h-6 w-9 rounded-sm border border-amber-400/60 bg-[linear-gradient(90deg,transparent_45%,rgba(120,80,10,0.35)_45%,rgba(120,80,10,0.35)_55%,transparent_55%),linear-gradient(0deg,transparent_45%,rgba(120,80,10,0.35)_45%,rgba(120,80,10,0.35)_55%,transparent_55%)]" />
                </div>
                <p className="text-xs tracking-[0.35em] text-white/70">
                  •••• {String(uid).replace(/-/g, "").slice(0, 4).toUpperCase()}
                </p>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-3xl font-semibold tracking-wide sm:text-5xl">
                    {accounts.isLoading ? "—" : formatMoney(total)}
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    Across {accounts.data?.length ?? 0} account
                    {(accounts.data?.length ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] tracking-[0.25em] text-white/60 uppercase">Cardholder</p>
                  <p className="text-sm font-medium tracking-widest uppercase">
                    {name || "Customer"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-transparent px-1 py-3 text-center transition-colors hover:border-border hover:bg-muted"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <action.icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="text-[11px] leading-tight font-medium">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your cards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cards.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (cards.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No cards issued yet. Your bank will issue one to your account.
                </p>
              ) : (
                (cards.data ?? []).slice(0, 2).map((card) => (
                  <Link
                    key={card.id}
                    to="/app/cards"
                    className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {card.masked_number}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {card.card_type === "virtual" ? "Virtual card" : "Physical card"}
                      </span>
                    </span>
                    <StatusBadge value={card.status} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Savings goals</CardTitle>
              <Link to="/app/savings" className="text-xs text-emerald hover:underline">
                Manage
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {savings.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (savings.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No goals yet. Create one to start putting money aside.
                </p>
              ) : (
                (savings.data ?? []).slice(0, 3).map((goal) => {
                  const pct = Number(goal.target_amount)
                    ? Math.min(
                        100,
                        Math.round((Number(goal.saved_amount) / Number(goal.target_amount)) * 100),
                      )
                    : 0;
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{goal.name}</span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                      <Progress value={pct} className="mt-1.5 h-1.5" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatMoney(goal.saved_amount)} of {formatMoney(goal.target_amount)}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Insights */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Financial insights</h2>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard
              icon={insights.trend !== null && insights.trend > 0 ? TrendingUp : TrendingDown}
              label="Spending this month"
              value={completed.length ? formatMoney(insights.spendThis) : "No data yet"}
              hint={
                insights.trend === null
                  ? "We'll compare with last month once there is history."
                  : `${insights.trend > 0 ? "Up" : "Down"} ${Math.abs(Math.round(insights.trend))}% vs last month`
              }
              tone={insights.trend !== null && insights.trend > 0 ? "warn" : "good"}
            />
            <InsightCard
              icon={PiggyBank}
              label="Net this month"
              value={completed.length ? formatMoney(insights.netThis) : "No data yet"}
              hint={
                completed.length
                  ? `${formatMoney(insights.incomeThis)} in, ${formatMoney(insights.spendThis)} out`
                  : "Money in and out will appear here."
              }
              tone={insights.netThis >= 0 ? "good" : "warn"}
            />
            <InsightCard
              icon={Receipt}
              label="Pending transactions"
              value={String(insights.pendingCount)}
              hint={
                insights.pendingCount
                  ? `${formatMoney(insights.pendingTotal)} awaiting settlement`
                  : "Nothing awaiting settlement."
              }
              tone={insights.pendingCount ? "warn" : "good"}
            />
            <InsightCard
              icon={UserCheck}
              label="Profile completion"
              value={`${insights.completion}%`}
              hint={
                insights.completion === 100
                  ? "Your profile is complete."
                  : "Complete your details in Settings."
              }
              progress={insights.completion}
              to="/app/settings"
            />
          </div>
        )}
      </section>

      {/* Analytics */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Analytics</h2>
          <div className="inline-flex rounded-lg border border-border p-1">
            {(Object.keys(rangeLabels) as Range[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  range === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {rangeLabels[key]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : !hasActivity ? (
          <Card className="card-elevated">
            <CardContent className="p-5">
              <EmptyState
                icon={LineChartIcon}
                title="No activity in this period"
                description="Once transactions are recorded on your accounts, your income, spending and cash flow charts will appear here."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Income vs expenses</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} width={48} fontSize={11} />
                    <Tooltip
                      formatter={(v: number) => formatMoney(v)}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="income" name="Income" fill="var(--emerald)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Savings growth</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.series}>
                    <defs>
                      <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} width={48} fontSize={11} />
                    <Tooltip
                      formatter={(v: number) => formatMoney(v)}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      name="Accumulated savings"
                      stroke="var(--emerald)"
                      strokeWidth={2}
                      fill="url(#savingsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Spending by category</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {analytics.categoryData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No spending recorded in this period.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(v: number) => formatMoney(v)}
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Pie
                        data={analytics.categoryData}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={86}
                        paddingAngle={2}
                      >
                        {analytics.categoryData.map((entry, i) => (
                          <Cell key={entry.label} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cash flow</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} width={48} fontSize={11} />
                    <Tooltip
                      formatter={(v: number) => formatMoney(v)}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="net" name="Net flow" radius={[4, 4, 0, 0]}>
                      {analytics.series.map((row) => (
                        <Cell
                          key={row.month}
                          fill={row.net >= 0 ? "var(--emerald)" : "var(--destructive)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Accounts */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Accounts</h2>
          <Link to="/app/accounts" className="text-sm text-emerald hover:underline">
            View all
          </Link>
        </div>
        {accounts.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : (accounts.data ?? []).length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No accounts opened yet"
            description="Once your onboarding is reviewed, your accounts will appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(accounts.data ?? []).map((account) => (
              <Card key={account.id} className="card-elevated">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="eyebrow">{accountTypeLabels[account.account_type]}</p>
                    <StatusBadge value={account.status} />
                  </div>
                  <p className="mt-3 font-display text-2xl font-semibold">
                    {formatMoney(account.balance, account.currency)}
                  </p>
                  <p className="mt-1 text-xs tracking-wide text-muted-foreground">
                    {formatIban(account.iban)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Recent activity</h2>
          <Link to="/app/transactions" className="text-sm text-emerald hover:underline">
            View all
          </Link>
        </div>
        <Card className="card-elevated">
          <CardContent className="p-0">
            {transactions.isLoading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : txs.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={ShieldCheck}
                  title="No transactions yet"
                  description="Your account activity will be listed here as soon as it happens."
                  action={
                    <Button asChild variant="outline">
                      <Link to="/app/transfers">
                        <ArrowUpRight className="h-4 w-4" /> Make a transfer
                      </Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {txs.slice(0, 8).map((tx) => {
                  const credit = isCredit(tx.type, Number(tx.amount));
                  return (
                    <li key={tx.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          credit ? "bg-emerald/10 text-emerald" : "bg-muted text-foreground",
                        )}
                      >
                        {credit ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{tx.description}</span>
                        <span className="block text-xs text-muted-foreground">
                          {transactionTypeLabels[tx.type] ?? tx.type} ·{" "}
                          {relativeDay(tx.occurred_at)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span
                          className={cn("block text-sm font-semibold", credit && "text-emerald")}
                        >
                          {credit ? "+" : "−"}
                          {formatMoney(Math.abs(Number(tx.amount)), tx.currency)}
                        </span>
                        <StatusBadge value={tx.status} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  progress,
  to,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint: string;
  tone?: "good" | "warn";
  progress?: number;
  to?: "/app/settings";
}) {
  const body = (
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tone === "warn" ? "bg-accent/15 text-accent" : "bg-emerald/10 text-emerald",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {typeof progress === "number" ? <Progress value={progress} className="mt-2 h-1.5" /> : null}
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </CardContent>
  );

  if (to) {
    return (
      <Card className="card-elevated transition-colors hover:bg-muted/40">
        <Link to={to}>{body}</Link>
      </Card>
    );
  }
  return <Card className="card-elevated">{body}</Card>;
}
