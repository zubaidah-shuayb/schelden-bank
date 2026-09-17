import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/signup")({
  head: () => ({
    meta: [
      { title: "Operations registration — Schelden Bank" },
      {
        name: "description",
        content: "Restricted registration for authorised Schelden Bank operations staff.",
      },
      { property: "og:title", content: "Operations registration — Schelden Bank" },
      { property: "og:description", content: "Authorised personnel only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSignupPage,
});

function AdminSignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Use at least 10 characters for an operations password.");
      return;
    }
    if (password !== confirm) {
      setError("Both passwords must match.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/login`,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError("That registration could not be completed.");
      return;
    }

    // Administrator rights are never granted here. The database grants them only
    // when the confirmed address matches the operations allowlist, keyed to the
    // authenticated user's UUID.
    setSent(true);
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

          {sent ? (
            <>
              <h1 className="mt-5 font-display text-2xl">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                If that address is registered for operations access, a confirmation link is on
                its way. Open it to activate the account, then sign in.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to="/admin/login">Go to operations sign-in</Link>
              </Button>
            </>
          ) : (
            <>
              <h1 className="mt-5 font-display text-2xl">Operations registration</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Restricted to approved Schelden Bank personnel. Console access is granted by the
                bank, not by this form. All attempts are recorded.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="admin-name">Full name</Label>
                  <Input
                    id="admin-name"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
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
                      autoComplete="new-password"
                      required
                      className="pr-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">At least 10 characters.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-confirm">Confirm password</Label>
                  <Input
                    id="admin-confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
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
                  {loading ? "Submitting…" : "Create operations account"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already registered?{" "}
                  <Link to="/admin/login" className="text-emerald underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </main>

      <p className="px-4 pb-6 text-center text-xs text-pearl/45">
        Schelden Bank — authorised personnel only.
      </p>
    </div>
  );
}
