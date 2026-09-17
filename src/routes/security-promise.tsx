import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Eye, KeyRound, Laptop, Lock, UserCheck } from "lucide-react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/security-promise")({
  head: () => ({
    meta: [
      { title: "Security — Schelden Bank" },
      {
        name: "description",
        content:
          "How Schelden Bank protects your account: verified sign-in, session control, device visibility and readable security activity.",
      },
      { property: "og:title", content: "Security — Schelden Bank" },
      {
        property: "og:description",
        content: "Verified sign-in, session control and readable security activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPromisePage,
});

const measures = [
  { icon: UserCheck, title: "Verified accounts", body: "Every account is confirmed by email before it can be used." },
  { icon: KeyRound, title: "Password protection", body: "Change your password at any time, with the current one required." },
  { icon: Laptop, title: "Device visibility", body: "See where your account is signed in and end sessions you don't recognise." },
  { icon: Eye, title: "Readable activity", body: "Security events written in plain language, not system codes." },
  { icon: Bell, title: "Security notices", body: "Alerts for new sign-ins and changes to your protection settings." },
  { icon: Lock, title: "Protected operations", body: "Financial records can only be changed by authorised bank operations, never from a browser." },
];

function SecurityPromisePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden brand-gradient">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <p className="eyebrow text-pearl/70">Security</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl text-pearl sm:text-5xl">
              Protection you can see, understand and control.
            </h1>
            <p className="mt-4 max-w-xl text-pearl/80">
              Security should never be a mystery. Schelden Bank shows you exactly what is protecting
              your account and puts the controls in your hands.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {measures.map(({ icon: Icon, title, body }) => (
              <article key={title} className="card-elevated p-6">
                <Icon className="h-5 w-5 text-emerald" aria-hidden />
                <h2 className="mt-4 font-display text-lg">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>

          <p className="mt-12 text-sm text-muted-foreground">
            Security is reviewed continuously by our Antwerp team, so your money and your data stay
            protected around the clock.
          </p>


          <div className="mt-8">
            <Button asChild>
              <Link to="/signup">Open an account</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
