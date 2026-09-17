import { createFileRoute, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { resolveNotificationLink } from "@/lib/notification-link";

export const Route = createFileRoute("/$")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Page not found — Schelden Bank" }, { name: "robots", content: "noindex" }],
  }),
  component: CatchAllPage,
});

// Older links (and notifications) sometimes point at bare paths such as
// /accounts or /cards. Send those to the real screen instead of a dead end.
function CatchAllPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const target = resolveNotificationLink(pathname);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!target || loading) return;
    navigate({ to: user ? target : "/login", replace: true });
  }, [target, loading, user, navigate]);

  if (target) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-2xl font-semibold">This page doesn’t exist</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The address {pathname} couldn’t be found. It may have moved or the link was incomplete.
      </p>
      <Button asChild>
        <Link to="/">Back to Schelden Bank</Link>
      </Button>
    </div>
  );
}
