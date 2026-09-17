import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/**
 * Persistent entry point to the existing Live Support experience.
 * It never renders a second chat — it links to /app/support.
 */
export function SupportFab() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const unread = useQuery({
    queryKey: ["support-unread", uid],
    enabled: !!uid,
    refetchInterval: 30_000,
    queryFn: async () => {
      // RLS limits this to the signed-in customer's own conversations.
      const { count, error } = await supabase
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_role", "admin")
        .is("read_at", null);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`support-fab:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages" },
        () => void unread.refetch(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem("schelden-support-fab-dismissed") === "1",
  );

  useEffect(() => {
    window.sessionStorage.setItem("schelden-support-fab-dismissed", dismissed ? "1" : "0");
  }, [dismissed]);

  if (!uid || dismissed || pathname.startsWith("/app/support")) return null;

  const count = unread.data ?? 0;

  return (
    <div
      className={cn(
        "fixed right-4 bottom-24 z-50",
        "lg:right-6 lg:bottom-6",
      )}
    >
      <button
        type="button"
        aria-label="Hide live support button"
        onClick={() => setDismissed(true)}
        className={cn(
          "absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full",
          "bg-background text-foreground shadow-md ring-1 ring-border transition-transform hover:scale-110 active:scale-90",
        )}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
      <Link
        to="/app/support"
        aria-label={`Live support${count ? `, ${count} unread message${count === 1 ? "" : "s"}` : ""}`}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full",
          "brand-gradient text-white shadow-2xl transition-transform hover:scale-105 active:scale-95",
        )}
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
        {count > 0 ? (
          <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald px-1 text-[10px] font-semibold text-white ring-2 ring-background">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
