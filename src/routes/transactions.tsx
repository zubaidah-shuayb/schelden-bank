import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/transactions")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Transactions — Schelden Bank" }],
  }),
  component: TransactionsRedirect,
});

// /transactions is not a page of its own — send the visitor to the
// transactions screen that belongs to their session.
function TransactionsRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const isAdmin = useQuery({
    queryKey: ["is-admin", user?.id ?? "anon"],
    enabled: !loading && !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw new Error(error.message);
      return data === true;
    },
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (isAdmin.isLoading) return;
    navigate({
      to: isAdmin.data === true ? "/admin/transactions" : "/app/transactions",
      replace: true,
    });
  }, [loading, user, isAdmin.isLoading, isAdmin.data, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
