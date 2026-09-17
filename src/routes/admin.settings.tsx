import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminAccountsQuery, adminProfilesQuery, adminTransactionsQuery } from "@/lib/admin-queries";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const profiles = useQuery(adminProfilesQuery());
  const accounts = useQuery(adminAccountsQuery());
  const transactions = useQuery(adminTransactionsQuery(1));

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        description="Your administrator profile, appearance and console information."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Administrator profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Line label="Signed in as" value={user?.email ?? "—"} />
            <Line label="Account reference" value={user?.id.slice(0, 8) ?? "—"} />
            <Line
              label="Email confirmed"
              value={user?.email_confirmed_at ? formatDateTime(user.email_confirmed_at) : "Not confirmed"}
            />
            <Line
              label="Last sign-in"
              value={user?.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "—"}
            />
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Administrator rights are held in the database against your account identifier and
              checked on every operation. They cannot be granted, changed or shared from this
              console, and no administrator can be created here.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                navigate({ to: "/admin/login" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out of this device
            </Button>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="admin-theme">Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
              <SelectTrigger id="admin-theme" className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">Match my device</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">System information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Line label="Customers on record" value={String((profiles.data ?? []).length)} />
            <Line label="Accounts on record" value={String((accounts.data ?? []).length)} />
            <Line
              label="Most recent posting"
              value={
                (transactions.data ?? [])[0]
                  ? formatDateTime((transactions.data ?? [])[0]!.occurred_at)
                  : "No transactions yet"
              }
            />
            <Line label="Support clearing" value="Automatic after 60 minutes of silence" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value}</span>
    </div>
  );
}
