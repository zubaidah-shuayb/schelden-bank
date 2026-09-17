import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/verify-email")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Email verified — Schelden Bank" },
      { name: "description", content: "Confirming your Schelden Bank account." },
      { property: "og:title", content: "Email verified — Schelden Bank" },
      { property: "og:description", content: "Confirming your Schelden Bank account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const [state, setState] = useState<"checking" | "verified" | "failed">("checking");

  useEffect(() => {
    let cancelled = false;

    // detectSessionInUrl exchanges the link's code for a session in the
    // background. Poll briefly instead of guessing a single delay, so a slow
    // network never shows a false "couldn't confirm".
    async function check(attempt: number): Promise<void> {
      if (cancelled) return;
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user?.email_confirmed_at) {
        setState("verified");
        return;
      }
      if (attempt >= 8) {
        setState("failed");
        return;
      }
      window.setTimeout(() => void check(attempt + 1), 700);
    }

    void check(0);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthLayout
      title={
        state === "verified"
          ? "Your account is confirmed"
          : state === "failed"
            ? "We couldn't confirm this link"
            : "Confirming your account"
      }
      subtitle={
        state === "checking" ? "This only takes a moment." : "Schelden Bank · Antwerp, Belgium"
      }
    >
      <div className="card-elevated p-7 text-center">
        {state === "checking" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald" aria-hidden />
            <p className="mt-4 text-sm text-muted-foreground">Verifying your email address…</p>
          </>
        ) : state === "verified" ? (
          <>
            <CheckCircle2 className="mx-auto h-9 w-9 text-emerald" aria-hidden />
            <p className="mt-4 text-sm text-muted-foreground">
              Welcome to Schelden Bank. Your email address is confirmed and your account is ready.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/login">Continue to sign in</Link>
            </Button>
          </>
        ) : (
          <>
            <TriangleAlert className="mx-auto h-9 w-9 text-warning" aria-hidden />
            <p className="mt-4 text-sm text-muted-foreground">
              This verification link may have expired or already been used. Sign in to request a new
              one.
            </p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
