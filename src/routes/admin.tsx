import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Operations console — Schelden Bank" },
      { name: "description", content: "Schelden Bank banking operations console." },
      { property: "og:title", content: "Operations console — Schelden Bank" },
      { property: "og:description", content: "Authorised personnel only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicRoute =
    pathname.startsWith("/admin/login") || pathname.startsWith("/admin/signup");

  if (isPublicRoute) return <Outlet />;
  return <AdminGate />;
}

function AdminGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Authorisation is answered by the database against the authenticated UUID.
  // Nothing in this browser can grant it.
  const authorised = useQuery({
    queryKey: ["is-admin", user?.id ?? "anon"],
    enabled: !loading && !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw new Error(error.message);
      return data === true;
    },
  });

  const denied = (!loading && !user) || authorised.data === false || authorised.isError;

  useEffect(() => {
    if (denied) navigate({ to: "/admin/login", replace: true });
  }, [denied, navigate]);

  if (loading || !user || authorised.isLoading || denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
