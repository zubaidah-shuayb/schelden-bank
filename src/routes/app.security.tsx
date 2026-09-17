import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, MailCheck, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { securityEventsQuery } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/security")({
  component: SecurityPage,
});

const riskStyles: Record<string, string> = {
  low: "bg-emerald/15 text-emerald",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

function SecurityPage() {
  const { user, signOut } = useAuth();
  const events = useQuery(securityEventsQuery(user!.id));
  const list = events.data ?? [];

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const emailVerified = Boolean(user?.email_confirmed_at);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Those passwords don't match.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password updated");
  }

  return (
    <div>
      <PageHeader
        title="Security centre"
        description="Check how your account is protected and review recent activity."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="space-y-3 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MailCheck className="h-5 w-5" aria-hidden />
            </span>
            <p className="font-display text-lg font-semibold">Email verification</p>
            <p className="text-sm text-muted-foreground">
              Sign-in is protected by a verification link sent to {user?.email}.
            </p>
            <Badge variant={emailVerified ? "default" : "secondary"}>
              {emailVerified ? "Verified" : "Awaiting verification"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="space-y-3 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <p className="font-display text-lg font-semibold">Session protection</p>
            <p className="text-sm text-muted-foreground">
              Your session is encrypted and refreshes automatically. Signing out ends it
              everywhere on this device.
            </p>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign out of this device
            </Button>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="space-y-3 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" aria-hidden />
            </span>
            <p className="font-display text-lg font-semibold">Card controls</p>
            <p className="text-sm text-muted-foreground">
              Freeze a card, cap your limits or switch off international use at any moment.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/cards">Manage cards</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="font-display text-lg font-semibold">Change your password</h2>
            </div>
            <form onSubmit={changePassword} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-display text-lg font-semibold">Recent security activity</h2>
          <div className="mt-4 space-y-3">
            {events.isLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
            ) : list.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No security activity yet"
                description="Sign-ins, password changes and alerts recorded by the bank will appear here."
              />
            ) : (
              list.map((event) => (
                <Card key={event.id}>
                  <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{event.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(event.created_at)}
                        {event.device_label ? ` · ${event.device_label}` : ""}
                        {event.ip_hint ? ` · ${event.ip_hint}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize",
                        riskStyles[event.risk] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {event.risk}
                    </span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
