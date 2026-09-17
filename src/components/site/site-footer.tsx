import { Link } from "@tanstack/react-router";

import { BrandLockup } from "@/components/brand/logo";

const columns = [
  {
    title: "Banking",
    links: [
      { to: "/accounts-overview", label: "Accounts" },
      { to: "/services", label: "Payments" },
      { to: "/services", label: "Cards" },
    ],
  },
  {
    title: "Financial services",
    links: [
      { to: "/services", label: "Savings" },
      { to: "/services", label: "Investments" },
      { to: "/services", label: "Loans" },
    ],
  },
  {
    title: "Support",
    links: [
      { to: "/security-promise", label: "Security" },
      { to: "/login", label: "Log in" },
      { to: "/signup", label: "Open an account" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]">
          <div className="min-w-0">
            <BrandLockup />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              People. Progress. A brighter tomorrow. Modern banking designed in Antwerp.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title} className="min-w-0">
              <h2 className="font-sans text-xs tracking-[0.2em] text-muted-foreground uppercase">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link, i) => (
                  <li key={`${link.label}-${i}`}>
                    <Link
                      to={link.to}
                      className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 rule-line" />

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Schelden Bank — People. Progress. A brighter tomorrow. Antwerp, Belgium.
          </p>
        </div>
      </div>
    </footer>
  );
}
