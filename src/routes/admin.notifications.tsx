import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyRow, StatCard, callRpc } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { adminNotificationsQuery, adminProfilesQuery, displayName } from "@/lib/admin-queries";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsPage,
});

function AdminNotificationsPage() {
  const notifications = useQuery(adminNotificationsQuery(300));
  const profiles = useQuery(adminProfilesQuery());

  const nameFor = (id: string) => displayName((profiles.data ?? []).find((p) => p.id === id));
  const rows = notifications.data ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        description="Messages delivered to customers inside their banking space."
        action={<SendDialog />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Delivered" value={rows.length} hint="Most recent 300" />
        <StatCard label="Unread" value={rows.filter((n) => !n.read_at).length} />
        <StatCard label="Security alerts" value={rows.filter((n) => n.category === "security").length} />
      </div>

      <Card className="card-elevated mt-6">
        <CardContent className="p-0">
          {notifications.isLoading ? (
            <EmptyRow>Loading notifications…</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow>No notifications have been sent yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((n) => (
                <li key={n.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {n.read_at ? "Read" : "Unread"} · {formatDateTime(n.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {nameFor(n.user_id)} · {n.category}
                  </p>
                  <p className="mt-2 text-sm">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SendDialog() {
  const profiles = useQuery(adminProfilesQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("system");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [working, setWorking] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Send notification</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send a notification</DialogTitle>
          <DialogDescription>Delivered to the customer's notification centre.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sn-user">Customer</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="sn-user">
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
            <Label htmlFor="sn-cat">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="sn-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["system", "security", "transactions", "support"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sn-title">Title</Label>
            <Input id="sn-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sn-body">Message</Label>
            <Textarea id="sn-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={working || !userId || title.trim().length < 3}
            onClick={async () => {
              setWorking(true);
              try {
                await callRpc("admin_send_notification", {
                  _user_id: userId,
                  _category: category,
                  _title: title.trim(),
                  _body: body.trim(),
                  _link_path: null,
                });
                toast.success("Notification sent.");
                await qc.invalidateQueries();
                setOpen(false);
                setTitle("");
                setBody("");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "The notification was refused.");
              } finally {
                setWorking(false);
              }
            }}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
