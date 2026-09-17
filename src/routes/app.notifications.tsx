import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCheck, CreditCard, LifeBuoy, Shield } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { resolveNotificationLink } from "@/lib/notification-link";
import { notificationsQuery } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsPage,
});

const icons: Record<string, typeof Bell> = {
  security: Shield,
  transactions: CreditCard,
  support: LifeBuoy,
  system: Bell,
};

function NotificationsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const notifications = useQuery(notificationsQuery(uid));
  const list = notifications.data ?? [];
  const unread = list.filter((n) => !n.read_at);

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", uid] }),
    onError: () => toast.error("We couldn't update your notifications."),
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alerts about your accounts, cards, security and support conversations."
        action={
          unread.length > 0 ? (
            <Button
              variant="outline"
              onClick={() => markRead.mutate(unread.map((n) => n.id))}
              disabled={markRead.isPending}
            >
              <CheckCheck className="h-4 w-4" /> Mark all as read
            </Button>
          ) : undefined
        }
      />

      {notifications.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing to read"
          description="When something happens on your accounts, you'll find it here."
        />
      ) : (
        <div className="space-y-3">
          {list.map((n) => {
            const Icon = icons[n.category] ?? Bell;
            const unreadItem = !n.read_at;
            return (
              <Card key={n.id} className={cn(unreadItem && "border-primary/40 bg-primary/[0.04]")}>
                <CardContent className="flex items-start gap-4 p-4">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      unreadItem ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {unreadItem ? (
                        <span className="rounded-full bg-emerald/15 px-2 py-0.5 text-[11px] font-medium text-emerald">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDateTime(n.created_at)}</span>
                      {resolveNotificationLink(n.link_path) ? (
                        <Link
                          to={resolveNotificationLink(n.link_path)!}
                          className="font-medium text-primary hover:underline"
                          onClick={() => {
                            if (!n.read_at) markRead.mutate([n.id]);
                          }}
                        >
                          Open
                        </Link>
                      ) : null}
                      {unreadItem ? (
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() => markRead.mutate([n.id])}
                        >
                          Mark as read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
