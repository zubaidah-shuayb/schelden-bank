import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/accounts-overview")({
  head: () => ({
    meta: [
      { title: "Everyday banking — Schelden Bank" },
      {
        name: "description",
        content:
          "Current Account, Savings Account and Personal Reserve: three clear accounts with their own IBAN, statements and history.",
      },
      { property: "og:title", content: "Everyday banking — Schelden Bank" },
      {
        property: "og:description",
        content: "Three clear personal accounts, each with its own IBAN and history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountsOverviewPage,
});

const accounts = [
  {
    name: "Current Account",
    purpose: "Everyday banking",
    points: ["Salary and bills", "Card payments", "SEPA transfers", "Full transaction history"],
  },
  {
    name: "Savings Account",
    purpose: "For saving",
    points: ["Goal tracking", "Separate from spending", "Monthly statements", "Interest activity"],
  },
  {
    name: "Personal Reserve",
    purpose: "Secondary reserve",
    points: ["Buffer for the unexpected", "Kept out of daily view", "Instant internal moves", "Its own IBAN"],
  },
];

function AccountsOverviewPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <p className="eyebrow">Everyday banking</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl sm:text-5xl">
              Three accounts. One clear picture.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Spending, saving and reserve kept properly apart, so you always know what is actually
              available.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-3">
            {accounts.map((account) => (
              <article key={account.name} className="card-elevated flex flex-col p-7">
                <p className="eyebrow">{account.purpose}</p>
                <h2 className="mt-2 font-display text-2xl">{account.name}</h2>
                <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                  {account.points.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Button asChild size="lg">
              <Link to="/signup">Open an account</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
