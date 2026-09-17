import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Operations sign-in — Schelden Bank" },
      { name: "description", content: "Authorised access only. Schelden Bank operations console." },
      { property: "og:title", content: "Operations sign-in — Schelden Bank" },
      { property: "og:description", content: "Authorised access only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError("Those credentials were not accepted.");
      return;
    }

    // Authorisation is decided by the database against the authenticated user's
    // UUID, never by anything typed into this browser.
    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
    setLoading(false);

    if (roleError || !isAdmin) {
      await supabase.auth.signOut();
      setError("This account is not authorised for the operations console.");
      return;
    }

    window.location.assign("/admin");
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark />
          <span className="min-w-0">
            <span className="block font-display text-sm tracking-[0.18em] text-pearl uppercase">
              Schelden Bank
            </span>
            <span className="block text-[0.6rem] tracking-[0.22em] text-pearl/60 uppercase">
              Operations console
            </span>
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-pearl/12 bg-card p-8 shadow-[var(--shadow-raised)]">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-2xl">Operations sign-in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Authorised administrators only. Access attempts are recorded.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Work email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {loading ? "Verifying…" : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Approved personnel without an account?{" "}
              <Link to="/admin/signup" className="text-emerald underline">
                Register
              </Link>
            </p>
          </form>
        </div>
      </main>

      <p className="px-4 pb-6 text-center text-xs text-pearl/45">
        Schelden Bank — authorised personnel only.
      </p>

    </div>
  );
}
