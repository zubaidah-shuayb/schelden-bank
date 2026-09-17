import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  BookOpen,
  CreditCard,
  FileText,
  Gauge,
  LifeBuoy,
  LogOut,
  Menu,
  Receipt,
  ScrollText,
  Settings,
  ShieldAlert,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const nav = [
  { to: "/admin", label: "Command centre", icon: Gauge, exact: true },
  { to: "/admin/customers", label: "Customers", icon: Users, exact: false },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt, exact: false },
  { to: "/admin/accounts", label: "Accounts & balances", icon: Wallet, exact: false },
  { to: "/admin/cards", label: "Cards", icon: CreditCard, exact: false },
  { to: "/admin/risk", label: "Verification & risk", icon: ShieldAlert, exact: false },
  { to: "/admin/support", label: "Live support", icon: LifeBuoy, exact: false },
  { to: "/admin/documents", label: "Documents", icon: FileText, exact: false },
  { to: "/admin/notifications", label: "Notifications", icon: Activity, exact: false },
  { to: "/admin/reports", label: "Reports", icon: BarChart3, exact: false },
  { to: "/admin/audit", label: "Audit logs", icon: ScrollText, exact: false },
  { to: "/admin/how-it-works", label: "How it works", icon: BookOpen, exact: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/admin/login" });
  }

  const navList = (onNavigate?: () => void) => (
    <>
      {nav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: item.exact }}
          activeProps={{ className: "bg-emerald/15 text-emerald font-medium" }}
          inactiveProps={{ className: "text-pearl/70" }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-pearl/10"
        >
          <item.icon className="h-4 w-4" aria-hidden />
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-pearl/10 bg-ink lg:flex">
          <div className="px-5 py-5">
            <Link to="/admin" className="flex items-center gap-3">
              <LogoMark size="sm" />
              <span>
                <span className="block font-display text-sm tracking-[0.16em] text-pearl uppercase">
                  Schelden
                </span>
                <span className="block text-[0.6rem] tracking-[0.2em] text-pearl/55 uppercase">
                  Operations
                </span>
              </span>
            </Link>
          </div>
          <nav className="scrollbar-hidden min-h-0 flex-1 space-y-1 overflow-y-auto px-3" aria-label="Operations">
            {navList()}
          </nav>
          <div className="border-t border-pearl/10 p-3">
            <p className="truncate px-3 pb-2 text-[11px] text-pearl/50">{user?.email}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-pearl/70 hover:bg-pearl/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open operations menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display text-sm tracking-[0.16em] uppercase">
              Operations console
            </span>
            <span className="ml-auto hidden truncate text-xs text-muted-foreground sm:block">
              {user?.email}
            </span>
          </header>

          <main className="flex-1 px-4 pb-16 pt-6 sm:px-6">{children}</main>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex h-dvh w-72 max-w-[85vw] flex-col bg-ink p-4 shadow-xl">
            <div className="flex shrink-0 items-center justify-between">
              <div className="flex items-center gap-3">
                <LogoMark size="sm" />
                <span className="font-display text-sm tracking-[0.16em] text-pearl uppercase">
                  Operations
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-pearl/20 text-pearl"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav
              className="scrollbar-hidden mt-5 min-h-0 flex-1 touch-pan-y space-y-1 overflow-y-auto overscroll-contain pb-4"
              aria-label="Operations mobile"
            >
              {navList(() => setOpen(false))}
            </nav>
            <Button variant="outline" onClick={handleSignOut} className="mt-2 w-full shrink-0">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
