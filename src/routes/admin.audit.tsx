import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyRow } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminAuditLogsQuery, adminProfilesQuery, displayName } from "@/lib/admin-queries";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/audit")({
  component: AuditPage,
});

function AuditPage() {
  const logs = useQuery(adminAuditLogsQuery(500));
  const profiles = useQuery(adminProfilesQuery());
  const [term, setTerm] = useState("");
  const [action, setAction] = useState("all");

  const nameFor = (id?: string | null) =>
    displayName((profiles.data ?? []).find((p) => p.id === id));

  const actions = useMemo(
    () => Array.from(new Set((logs.data ?? []).map((l) => l.action))).sort(),
    [logs.data],
  );

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (logs.data ?? [])
      .filter((l) => (action === "all" ? true : l.action === action))
      .filter((l) =>
        q
          ? [l.action, l.admin_email, l.reason, nameFor(l.target_user)]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
          : true,
      );
  }, [logs.data, profiles.data, term, action]);

  return (
    <div>
      <AdminPageHeader
        title="Audit logs"
        description="Read-only record of every administrative action, with before and after values."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search audit log"
            placeholder="Action, administrator, customer or reason"
            className="pl-9"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[220px]" aria-label="Action filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-0">
          {logs.isLoading ? (
            <EmptyRow>Loading audit log…</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow>No administrative actions recorded yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((l) => (
                <li key={l.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium capitalize">{l.action.replace(/_/g, " ")}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(l.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.admin_email ?? "Administrator"} · {nameFor(l.target_user)} ·{" "}
                    {l.target_table ?? "—"}
                  </p>
                  {l.reason ? <p className="mt-2 text-sm">{l.reason}</p> : null}
                  {l.previous_value || l.new_value ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <pre className="scrollbar-hidden overflow-x-auto rounded-lg bg-muted/50 p-2 text-[11px]">
                        before: {JSON.stringify(l.previous_value ?? {}, null, 0)}
                      </pre>
                      <pre className="scrollbar-hidden overflow-x-auto rounded-lg bg-muted/50 p-2 text-[11px]">
                        after: {JSON.stringify(l.new_value ?? {}, null, 0)}
                      </pre>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
