import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CreditCard,
  Landmark,
  LifeBuoy,
  LineChart,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import antwerpHero from "@/assets/antwerp-hero.jpg";
import landingAppHand from "@/assets/landing-app-hand.jpg";
import landingCard from "@/assets/landing-card.jpg";
import landingCouple from "@/assets/landing-couple.jpg";
import landingGroteMarkt from "@/assets/landing-grote-markt.jpg";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Schelden Bank — Modern banking for a brighter Belgium" },
      {
        name: "description",
        content:
          "Schelden Bank is a premium digital bank from Antwerp: accounts, payments, cards, savings and live support in one calm, secure experience.",
      },
      { property: "og:title", content: "Schelden Bank — Modern banking for a brighter Belgium" },
      {
        property: "og:description",
        content: "Accounts, payments, cards and live support, designed in Antwerp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const pillars = [
  {
    icon: Landmark,
    title: "Accounts with clarity",
    body: "A Current Account, a Savings Account and a Personal Reserve — each with its own IBAN, statements and full history.",
  },
  {
    icon: Send,
    title: "Payments without friction",
    body: "Saved beneficiaries, clean references and a review step before anything leaves your account.",
  },
  {
    icon: CreditCard,
    title: "Cards you control",
    body: "Physical and virtual cards. Freeze instantly, set limits, and switch online, contactless or international use.",
  },
  {
    icon: ShieldCheck,
    title: "Security by design",
    body: "Verified sign-in, recognised devices, recent activity and a single place to end other sessions.",
  },
  {
    icon: LineChart,
    title: "Financial services",
    body: "Savings goals, an investment portfolio and a loan calculator that shows the real shape of a repayment.",
  },
  {
    icon: LifeBuoy,
    title: "Support that answers",
    body: "Live Support inside your banking session — real people, real time, full conversation history.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={antwerpHero}
              alt="The Scheldt riverfront in Antwerp at dusk"
              width={1600}
              height={1104}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-ink/82" />
            <div className="absolute inset-0 brand-gradient opacity-35" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
            <p className="eyebrow rise-in text-pearl/70">Antwerp · Belgium</p>
            <h1 className="rise-in mt-5 max-w-3xl font-display text-4xl leading-[1.05] text-pearl sm:text-6xl lg:text-7xl">
              Modern banking for a brighter Belgium.
            </h1>
            <p className="rise-in mt-6 max-w-xl text-base leading-relaxed text-pearl/80 sm:text-lg">
              Everyday accounts, payments, cards and financial services in one composed experience —
              built on simplicity, security and the confidence that comes from knowing where you
              stand.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="group">
                <Link to="/signup">
                  Open an account
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-pearl/35 bg-transparent text-pearl hover:bg-pearl/10 hover:text-pearl"
              >
                <Link to="/services">Explore our services</Link>
              </Button>
            </div>

            <dl className="mt-16 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-3">
              {[
                ["3", "Personal accounts"],
                ["24/7", "Live support"],
                ["€0", "Hidden charges"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-3xl text-pearl">{value}</dt>
                  <dd className="mt-1 text-xs tracking-[0.16em] text-pearl/60 uppercase">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Pillars */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow">Banking without friction</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              Everything in its place, nothing in your way.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Schelden Bank is organised around the four questions that actually matter: what do I
              have, what happened, what can I do, and where can I get help.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map(({ icon: Icon, title, body }) => (
              <article key={title} className="card-elevated group p-6 transition-shadow hover:shadow-[var(--shadow-raised)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Security band */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <p className="eyebrow">Security</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                Protection you can actually see.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Every sign-in, device and security change is recorded in one place, in plain
                language. You can end other sessions, review recent activity and tighten your
                account in a few taps.
              </p>
              <Button asChild variant="outline" className="mt-7">
                <Link to="/security-promise">Our security promise</Link>
              </Button>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                [Lock, "Verified sign-in", "Email-verified accounts and password protection."],
                [ShieldCheck, "Session control", "End access on devices you no longer use."],
                [Sparkles, "Clear activity", "Security events you can read and understand."],
                [LifeBuoy, "Help in-session", "Support reachable from any screen."],
              ].map(([Icon, title, body]) => {
                const Ico = Icon as typeof Lock;
                return (
                  <li key={title as string} className="card-elevated p-5">
                    <Ico className="h-5 w-5 text-emerald" aria-hidden />
                    <h3 className="mt-3 text-sm font-semibold">{title as string}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{body as string}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Everyday banking showcase */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="overflow-hidden rounded-2xl border border-border">
              <img
                src={landingAppHand}
                alt="A customer checking her Schelden Bank balance on her phone at an Antwerp café"
                width={1408}
                height={1024}
                loading="lazy"
                className="h-72 w-full object-cover sm:h-96 lg:h-[28rem]"
              />
            </div>
            <div>
              <p className="eyebrow">Everyday banking</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                Your whole bank, wherever the day takes you.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Balances, recent transactions and quick actions on one calm screen — whether you are
                at the kitchen table or on the terrace at the Groenplaats. No clutter, no fine print
                surprises.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "See every account and its IBAN at a glance",
                  "Move money to saved beneficiaries in a few steps",
                  "Get notified the moment anything happens",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Cards showcase */}
        <section className="border-y border-border bg-ink">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
            <div className="order-2 lg:order-1">
              <p className="eyebrow text-emerald">Cards</p>
              <h2 className="mt-3 font-display text-3xl text-pearl sm:text-4xl">
                A card that answers to you, not the other way round.
              </h2>
              <p className="mt-4 text-pearl/70">
                Physical and virtual cards with instant controls. Freeze a card the second you
                misplace it, set your own spending limits, and switch online, contactless or
                international use on and off as you need them.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-7 border-pearl/35 bg-transparent text-pearl hover:bg-pearl/10 hover:text-pearl"
              >
                <Link to="/services">See card features</Link>
              </Button>
            </div>
            <div className="order-1 overflow-hidden rounded-2xl border border-pearl/15 lg:order-2">
              <img
                src={landingCard}
                alt="A premium deep-green Schelden Bank card with a silver wave engraving"
                width={1408}
                height={1024}
                loading="lazy"
                className="h-72 w-full object-cover sm:h-96 lg:h-[28rem]"
              />
            </div>
          </div>
        </section>

        {/* Planning ahead showcase */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">Planning ahead</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                Big plans deserve a clear picture.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Savings goals that show real progress, an investment portfolio to explore, and a
                loan calculator that lays out the monthly payment, the total repayment and the
                interest — before you decide anything.
              </p>
              <Button asChild variant="outline" className="mt-7">
                <Link to="/services">Explore financial services</Link>
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border">
              <img
                src={landingCouple}
                alt="A couple reviewing their household finances together at home in Belgium"
                width={1408}
                height={1024}
                loading="lazy"
                className="h-72 w-full object-cover sm:h-96 lg:h-[28rem]"
              />
            </div>
          </div>
        </section>

        {/* Antwerp identity */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div className="overflow-hidden rounded-2xl border border-border">
              <img
                src={landingGroteMarkt}
                alt="The Grote Markt in Antwerp with its guild houses and cathedral tower"
                width={1408}
                height={1024}
                loading="lazy"
                className="h-72 w-full object-cover lg:h-96"
              />
            </div>
            <div>
              <p className="eyebrow">Made in Antwerp</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                A bank shaped by the city it comes from.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Antwerp has traded, built and rebuilt for centuries along the Scheldt. Schelden Bank
                takes that same long view: careful with detail, direct in language, and designed for
                people who are planning further ahead than this month.
              </p>
              <p className="mt-4 font-display text-xl text-emerald">
                People. Progress. A brighter tomorrow.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden brand-gradient">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
            <h2 className="mx-auto max-w-2xl font-display text-3xl text-pearl sm:text-5xl">
              Start banking with Schelden.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pearl/80">
              Open your account in minutes and explore the full Schelden Bank experience.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link to="/signup">Open an account</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-pearl/35 bg-transparent text-pearl hover:bg-pearl/10 hover:text-pearl"
              >
                <Link to="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
