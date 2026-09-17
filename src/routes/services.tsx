import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, LineChart, PiggyBank, Send, ShieldCheck, Wallet } from "lucide-react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Financial services — Schelden Bank" },
      {
        name: "description",
        content:
          "Savings, investments, loans, insurance, payments and cards — the full Schelden Bank ecosystem, designed in Antwerp.",
      },
      { property: "og:title", content: "Financial services — Schelden Bank" },
      {
        property: "og:description",
        content: "Savings, investments, loans, payments and cards from Schelden Bank.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

const services = [
  {
    icon: PiggyBank,
    title: "Savings",
    body: "Set goals with a target and a date, then watch progress build. Emergency reserve, travel, a new laptop — whatever you are working towards.",
  },
  {
    icon: LineChart,
    title: "Investments",
    body: "A clear portfolio view with holdings, allocation and performance over time, presented without jargon.",
  },
  {
    icon: Wallet,
    title: "Loans",
    body: "Enter an amount and a term and see the estimated monthly payment, total repayment and interest shape instantly.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance",
    body: "Cover concepts presented in plain language, so you can compare what matters without reading a contract first.",
  },
  {
    icon: Send,
    title: "Payments",
    body: "Saved beneficiaries, clear references and a review step before you confirm anything.",
  },
  {
    icon: CreditCard,
    title: "Cards",
    body: "Physical and virtual cards with instant freeze, spending limits and per-channel controls.",
  },
];

function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <p className="eyebrow">Discover</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl sm:text-5xl">
              A complete banking ecosystem, without the clutter.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Every Schelden Bank service is built to be understood at a glance and acted on in a
              few taps.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ icon: Icon, title, body }) => (
              <article key={title} className="card-elevated p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="mt-5 font-display text-xl">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-14 card-elevated flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl">Ready when you are.</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open an account and explore every service inside your banking session.
              </p>
            </div>
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
