import { Link } from "@tanstack/react-router";

import { BrandLockup } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden overflow-hidden brand-gradient lg:block">
          <div className="relative z-10 flex h-full flex-col justify-between p-12">
            <BrandLockup className="[&_span]:text-pearl" />
            <div>
              <h2 className="max-w-sm font-display text-4xl leading-tight text-pearl">
                People. Progress. A brighter tomorrow.
              </h2>
              <p className="mt-4 max-w-sm text-sm text-pearl/80">
                Banking built in Antwerp for people who expect clarity, security and calm.
              </p>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-pearl/70">
              Antwerp • Belgium — banking made clear, secure and human.
            </p>

          </div>
        </aside>

        <main className="flex flex-col px-4 py-8 sm:px-10">
          <div className="flex items-center justify-between gap-4">
            <BrandLockup className="lg:hidden" />
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <h1 className="font-display text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-8">{footer}</div> : null}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Back to schelden.bank
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
