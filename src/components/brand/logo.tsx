import { Link } from "@tanstack/react-router";

import logoAsset from "@/assets/schelden-bank-logo.png";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

export function LogoMark({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-xl ring-1 ring-border",
        sizes[size],
        className,
      )}
    >
      <img
        src={logoAsset}
        alt="Schelden Bank"
        className="h-full w-full object-cover"
        loading="eager"
        decoding="async"
      />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col leading-none", className)}>
      <span className="font-display text-lg font-semibold tracking-[0.14em] uppercase">
        Schelden <span className="text-emerald">Bank</span>
      </span>
      <span className="mt-1 text-[0.58rem] tracking-[0.24em] text-muted-foreground uppercase">
        Antwerp · Belgium
      </span>
    </span>
  );
}

export function BrandLockup({
  to = "/",
  size = "md",
  showWordmark = true,
  className,
}: {
  to?: string;
  size?: keyof typeof sizes;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn("flex min-w-0 items-center gap-3 rounded-lg", className)}
      aria-label="Schelden Bank home"
    >
      <LogoMark size={size} />
      {showWordmark ? <Wordmark /> : null}
    </Link>
  );
}
