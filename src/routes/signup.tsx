import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { useState } from "react";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Open an account — Schelden Bank" },
      {
        name: "description",
        content: "Open your Schelden Bank account: accounts, cards, payments and live support.",
      },
      { property: "og:title", content: "Open an account — Schelden Bank" },
      { property: "og:description", content: "Join Schelden Bank in a few simple steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

type Form = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth: string;
  nationality: string;
  street: string;
  postalCode: string;
  city: string;
};

const empty: Form = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  dateOfBirth: "",
  nationality: "Belgian",
  street: "",
  postalCode: "",
  city: "Antwerp",
};

function SignupPage() {
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const email = form.email.trim().toLowerCase();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!firstName || !lastName) {
      setError("Enter your first and last name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (form.password.length < 8) {
      setError("Choose a password of at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: form.phone.trim(),
          date_of_birth: form.dateOfBirth,
          nationality: form.nationality,
          address_street: form.street,
          address_postal_code: form.postalCode,
          address_city: form.city,
          address_country: "Belgium",
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes("already")
          ? "An account already exists for this email address. Try signing in instead."
          : "We couldn't create your account right now. Please try again.",
      );
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="One step left before your account is active.">
        <div className="card-elevated p-6 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald/10 text-emerald">
            <MailCheck className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 text-sm text-muted-foreground">
            We've sent a verification link to <span className="text-foreground">{form.email}</span>.
            Open it and your account will be confirmed automatically.
          </p>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Open an account"
      subtitle="A few details to set up your Schelden Bank profile."
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" required value={form.firstName} onChange={update("firstName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" required value={form.lastName} onChange={update("lastName")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={update("email")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+32 4xx xx xx xx"
              value={form.phone}
              onChange={update("phone")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              required
              value={form.dateOfBirth}
              onChange={update("dateOfBirth")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Input id="nationality" value={form.nationality} onChange={update("nationality")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="street">Street and number</Label>
          <Input
            id="street"
            placeholder="Meir 24"
            value={form.street}
            onChange={update("street")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input id="postalCode" placeholder="2000" value={form.postalCode} onChange={update("postalCode")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={update("city")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={form.password}
              onChange={update("password")}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {loading ? "Creating your account…" : "Open my account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already with us?{" "}
          <Link to="/login" className="text-emerald hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
