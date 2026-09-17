import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyRow } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
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
import { adminAccountsQuery, adminProfilesQuery, displayName } from "@/lib/admin-queries";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/customers/")({
  component: CustomersPage,
});

function CustomersPage() {
  const profiles = useQuery(adminProfilesQuery());
  const accounts = useQuery(adminAccountsQuery());
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    const balances = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const a of accounts.data ?? []) {
      balances.set(a.user_id, (balances.get(a.user_id) ?? 0) + Number(a.balance));
      counts.set(a.user_id, (counts.get(a.user_id) ?? 0) + 1);
    }
    const q = term.trim().toLowerCase();
    return (profiles.data ?? [])
      .filter((p) => (status === "all" ? true : p.verification_status === status))
      .filter((p) =>
        q
          ? [p.first_name, p.last_name, p.email, p.phone, p.address_city]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true,
      )
      .map((p) => ({
        profile: p,
        balance: balances.get(p.id) ?? 0,
        accounts: counts.get(p.id) ?? 0,
      }));
  }, [profiles.data, accounts.data, term, status]);

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        description="Search the customer base and open a full banking profile."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search customers"
            placeholder="Name, email, phone or city"
            className="pl-9"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]" aria-label="Verification filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verification states</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="needs_information">Needs information</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-0">
          {profiles.isLoading ? (
            <EmptyRow>Loading customers…</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow>No customers match this search.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map(({ profile, balance, accounts: count }) => (
                <li key={profile.id}>
                  <Link
                    to="/admin/customers/$userId"
                    params={{ userId: profile.id }}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-muted/50 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{displayName(profile)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {profile.email} · {profile.address_city ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatMoney(balance)}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} account{count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <StatusBadge value={profile.verification_status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
