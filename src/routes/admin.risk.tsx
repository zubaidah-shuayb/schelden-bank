import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyRow, StatCard, callRpc } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { adminProfilesQuery, adminRiskCasesQuery, displayName } from "@/lib/admin-queries";
import { formatDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/risk")({
  component: RiskPage,
});

function RiskPage() {
  const profiles = useQuery(adminProfilesQuery());
  const risks = useQuery(adminRiskCasesQuery());
  const qc = useQueryClient();

  const people = profiles.data ?? [];
  const nameFor = (id?: string | null) => displayName(people.find((p) => p.id === id));
  const pending = people.filter((p) => p.verification_status !== "verified");

  async function setVerification(userId: string, status: string) {
    try {
      await callRpc("admin_set_verification_status", {
        _user_id: userId,
        _status: status,
        _reason: "Reviewed in the risk centre",
      });
      toast.success("Verification updated and audited.");
      await qc.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The change was refused.");
    }
  }

  async function setCaseState(id: string, state: string) {
    const { error } = await supabase.from("risk_cases").update({ state }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Case ${state}.`);
      await qc.invalidateQueries();
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Verification & risk"
        description="Identity checks and risk cases. Verification always runs through the audited function."
        action={<NewCaseDialog />}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Verified" value={people.filter((p) => p.verification_status === "verified").length} />
        <StatCard label="Awaiting review" value={pending.length} />
        <StatCard label="Open cases" value={(risks.data ?? []).filter((r) => r.state !== "closed").length} />
        <StatCard
          label="High or critical"
          value={(risks.data ?? []).filter((r) => ["high", "critical"].includes(r.level)).length}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Verification queue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pending.length === 0 ? (
              <EmptyRow>Every customer is verified.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {pending.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <Link
                        to="/admin/customers/$userId"
                        params={{ userId: p.id }}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {displayName(p)}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={p.verification_status} />
                      <Button size="sm" onClick={() => setVerification(p.id, "verified")}>
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVerification(p.id, "needs_information")}
                      >
                        Request info
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Risk cases</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(risks.data ?? []).length === 0 ? (
              <EmptyRow>No risk cases recorded.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {(risks.data ?? []).map((r) => (
                  <li key={r.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{r.title}</p>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={r.level} />
                        <StatusBadge value={r.state} />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {nameFor(r.user_id)} · {formatDateTime(r.created_at)}
                    </p>
                    {r.detail ? <p className="mt-2 text-sm">{r.detail}</p> : null}
                    <div className="mt-3 flex gap-2">
                      {r.state !== "closed" ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setCaseState(r.id, "investigating")}>
                            Investigating
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setCaseState(r.id, "closed")}>
                            Close case
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setCaseState(r.id, "open")}>
                          Reopen
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NewCaseDialog() {
  const profiles = useQuery(adminProfilesQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [level, setLevel] = useState("medium");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [working, setWorking] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New risk case</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Open a risk case</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rc-user">Customer</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="rc-user">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {(profiles.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {displayName(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-level">Risk level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="rc-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["low", "medium", "high", "critical"].map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-title">Title</Label>
            <Input id="rc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rc-detail">Detail</Label>
            <Textarea id="rc-detail" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={working || !userId || title.trim().length < 3}
            onClick={async () => {
              setWorking(true);
              const { error } = await supabase.from("risk_cases").insert({
                user_id: userId,
                level,
                title: title.trim(),
                detail: detail.trim() || null,
              });
              setWorking(false);
              if (error) {
                toast.error(error.message);
                return;
              }
              toast.success("Risk case opened.");
              await qc.invalidateQueries();
              setOpen(false);
              setTitle("");
              setDetail("");
            }}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Open case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
