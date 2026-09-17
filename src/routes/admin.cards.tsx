import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyRow, StatCard } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { adminAccountsQuery, adminCardsQuery, adminProfilesQuery, displayName } from "@/lib/admin-queries";
import { formatIban, formatMoney } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/cards")({
  component: AdminCardsPage,
});

function AdminCardsPage() {
  const cards = useQuery(adminCardsQuery());
  const profiles = useQuery(adminProfilesQuery());
  const accounts = useQuery(adminAccountsQuery());
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");

  const nameFor = (id: string) => displayName((profiles.data ?? []).find((p) => p.id === id));
  const ibanFor = (id: string) => (accounts.data ?? []).find((a) => a.id === id)?.iban ?? "";

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (cards.data ?? [])
      .filter((c) => (status === "all" ? true : c.status === status))
      .filter((c) =>
        q ? `${c.masked_number} ${c.cardholder_name} ${nameFor(c.user_id)}`.toLowerCase().includes(q) : true,
      );
  }, [cards.data, profiles.data, term, status]);

  async function patch(id: string, patchData: Record<string, unknown>, message: string) {
    const { error } = await supabase.from("cards").update(patchData).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(message);
    await qc.invalidateQueries();
  }

  return (
    <div>
      <AdminPageHeader title="Cards" description="Card status, limits and payment settings." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Cards issued" value={(cards.data ?? []).length} />
        <StatCard label="Active" value={(cards.data ?? []).filter((c) => c.status === "active").length} />
        <StatCard label="Frozen" value={(cards.data ?? []).filter((c) => c.status === "frozen").length} />
      </div>

      <div className="mt-6 mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search cards"
            placeholder="Card number, cardholder or customer"
            className="pl-9"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]" aria-label="Card status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["active", "inactive", "frozen", "replaced", "cancelled"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {cards.isLoading ? (
        <EmptyRow>Loading cards…</EmptyRow>
      ) : rows.length === 0 ? (
        <Card className="card-elevated">
          <CardContent>
            <EmptyRow>No cards match these filters.</EmptyRow>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((c) => (
            <Card key={c.id} className="card-elevated">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg">{c.masked_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.cardholder_name} · {c.card_type === "virtual" ? "Virtual" : "Physical debit"}
                    </p>
                    <Link
                      to="/admin/customers/$userId"
                      params={{ userId: c.user_id }}
                      className="text-xs text-primary hover:underline"
                    >
                      {nameFor(c.user_id)} · {formatIban(ibanFor(c.account_id))}
                    </Link>
                  </div>
                  <StatusBadge value={c.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`daily-${c.id}`} className="text-xs">
                      Daily limit ({formatMoney(c.daily_limit)})
                    </Label>
                    <Input
                      id={`daily-${c.id}`}
                      inputMode="numeric"
                      defaultValue={String(c.daily_limit)}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== Number(c.daily_limit))
                          patch(c.id, { daily_limit: v }, "Daily limit updated.");
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`monthly-${c.id}`} className="text-xs">
                      Monthly limit ({formatMoney(c.monthly_limit)})
                    </Label>
                    <Input
                      id={`monthly-${c.id}`}
                      inputMode="numeric"
                      defaultValue={String(c.monthly_limit)}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== Number(c.monthly_limit))
                          patch(c.id, { monthly_limit: v }, "Monthly limit updated.");
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { key: "online_payments_enabled", label: "Online payments", value: c.online_payments_enabled },
                    { key: "contactless_enabled", label: "Contactless", value: c.contactless_enabled },
                    { key: "international_enabled", label: "International", value: c.international_enabled },
                  ].map((row) => (
                    <div key={row.key} className="flex items-center justify-between">
                      <span className="text-sm">{row.label}</span>
                      <Switch
                        checked={row.value}
                        aria-label={row.label}
                        onCheckedChange={(v) => patch(c.id, { [row.key]: v }, `${row.label} updated.`)}
                      />
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    patch(
                      c.id,
                      { status: c.status === "frozen" ? "active" : "frozen" },
                      c.status === "frozen" ? "Card unfrozen." : "Card frozen.",
                    )
                  }
                >
                  {c.status === "frozen" ? "Unfreeze card" : "Freeze card"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
