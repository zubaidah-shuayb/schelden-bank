import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Bell,
  Calculator,
  CreditCard,
  Home,
  FileText,
  LifeBuoy,
  LineChart,
  LogOut,
  Menu,
  PiggyBank,
  Receipt,
  Settings,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { SupportFab } from "@/components/app/support-fab";
import { LogoMark } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { initialsFrom } from "@/lib/format";
import { notificationsQuery, profileQuery } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Overview", icon: Home, exact: true },
  { to: "/app/accounts", label: "Accounts", icon: PiggyBank, exact: false },
  { to: "/app/transactions", label: "Transactions", icon: Receipt, exact: false },
  { to: "/app/transfers", label: "Transfers", icon: ArrowLeftRight, exact: false },
  { to: "/app/beneficiaries", label: "Beneficiaries", icon: Users, exact: false },
  { to: "/app/cards", label: "Cards", icon: CreditCard, exact: false },
  { to: "/app/savings", label: "Savings goals", icon: Target, exact: false },
  { to: "/app/investments", label: "Investments", icon: LineChart, exact: false },
  { to: "/app/loans", label: "Loan calculator", icon: Calculator, exact: false },
  { to: "/app/documents", label: "Documents", icon: FileText, exact: false },
  { to: "/app/notifications", label: "Notifications", icon: Bell, exact: false },
  { to: "/app/security", label: "Security centre", icon: ShieldCheck, exact: false },
  { to: "/app/settings", label: "Settings & profile", icon: Settings, exact: false },
] as const;

const mobileNav = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/transfers", label: "Payments", icon: ArrowLeftRight, exact: false },
  { to: "/app/cards", label: "Cards", icon: CreditCard, exact: false },
  { to: "/app/transactions", label: "Activity", icon: Receipt, exact: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const userId = user?.id ?? "";
  const profile = useQuery({ ...profileQuery(userId), enabled: !!user });
  const notifications = useQuery({ ...notificationsQuery(userId), enabled: !!user });
  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length;
  const avatar = useQuery({
    queryKey: ["avatar", userId, profile.data?.avatar_path],
    enabled: Boolean(user && profile.data?.avatar_path),
    queryFn: async () => {
      const path = profile.data?.avatar_path;
      if (!path) return null;
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  const initials = initialsFrom(
    profile.data?.first_name,
    profile.data?.last_name,
    user?.email ?? null,
  );

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
          <div className="px-5 py-5">
            <Link to="/app" className="flex items-center gap-3">
              <LogoMark size="sm" />
              <span className="font-display text-lg font-semibold tracking-tight">
                Schelden Bank
              </span>
            </Link>
          </div>
           <nav className="scrollbar-hidden min-h-0 flex-1 space-y-1 overflow-y-auto px-3" aria-label="Customer">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                activeProps={{ className: "bg-primary/10 text-primary font-medium" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted"
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="space-y-1 border-t border-border p-3">
            <Link
              to="/app/support"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"
            >
              <LifeBuoy className="h-4 w-4" aria-hidden />
              Live support
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"
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
              aria-label="Open menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/app" className="lg:hidden">
              <LogoMark size="sm" />
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/app/notifications"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald px-1 text-[10px] font-semibold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
              <Avatar className="h-10 w-10 border border-border">
                {avatar.data ? <AvatarImage src={avatar.data} alt="Your profile picture" /> : null}
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
        </div>
      </div>

      {/* Mobile drawer */}
      {open ? (
         <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
           <div className="absolute inset-y-0 left-0 flex h-dvh w-72 max-w-[85vw] flex-col overflow-hidden bg-background p-4 shadow-xl">
             <div className="flex shrink-0 items-center justify-between">
              <div className="flex items-center gap-3">
                <LogoMark size="sm" />
                <span className="font-display text-base font-semibold">Schelden Bank</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
             <nav
               className="scrollbar-hidden mt-5 min-h-0 flex-1 touch-pan-y space-y-1 overflow-y-auto overscroll-contain pb-4"
               aria-label="Customer mobile"
             >
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: item.exact }}
                  activeProps={{ className: "bg-primary/10 text-primary font-medium" }}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm"
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              ))}
            </nav>
             <Button variant="outline" onClick={handleSignOut} className="mt-2 w-full shrink-0">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      ) : null}

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
      >
        {mobileNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px]"
          >
            <item.icon className="h-5 w-5" aria-hidden />
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground")}
        >
          <Settings className="h-5 w-5" aria-hidden />
          More
        </button>
      </nav>

      <SupportFab />
    </div>
  );
}

export function PageHeader({
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
