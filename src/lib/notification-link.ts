// Notifications store a free-form link_path. Map whatever is stored onto a
// route that actually exists in the customer area so "Open" never 404s.

const CUSTOMER_ROUTES = [
  "/app",
  "/app/accounts",
  "/app/transactions",
  "/app/transfers",
  "/app/beneficiaries",
  "/app/cards",
  "/app/savings",
  "/app/investments",
  "/app/loans",
  "/app/documents",
  "/app/notifications",
  "/app/security",
  "/app/settings",
  "/app/support",
] as const;

export type CustomerRoute = (typeof CUSTOMER_ROUTES)[number];

const ALIASES: Record<string, CustomerRoute> = {
  "": "/app",
  "/": "/app",
  "/dashboard": "/app",
  "/overview": "/app",
  "/home": "/app",
  "/account": "/app/accounts",
  "/accounts": "/app/accounts",
  "/accounts-overview": "/app/accounts",
  "/transaction": "/app/transactions",
  "/transactions": "/app/transactions",
  "/activity": "/app/transactions",
  "/statements": "/app/transactions",
  "/transfer": "/app/transfers",
  "/transfers": "/app/transfers",
  "/payments": "/app/transfers",
  "/payment": "/app/transfers",
  "/beneficiary": "/app/beneficiaries",
  "/beneficiaries": "/app/beneficiaries",
  "/recipients": "/app/beneficiaries",
  "/card": "/app/cards",
  "/cards": "/app/cards",
  "/saving": "/app/savings",
  "/savings": "/app/savings",
  "/goals": "/app/savings",
  "/investment": "/app/investments",
  "/investments": "/app/investments",
  "/loan": "/app/loans",
  "/loans": "/app/loans",
  "/document": "/app/documents",
  "/documents": "/app/documents",
  "/notification": "/app/notifications",
  "/notifications": "/app/notifications",
  "/security": "/app/security",
  "/verification": "/app/security",
  "/identity": "/app/security",
  "/settings": "/app/settings",
  "/profile": "/app/settings",
  "/support": "/app/support",
  "/help": "/app/support",
  "/chat": "/app/support",
};

/** Resolve a stored notification path to a real customer route, or null. */
export function resolveNotificationLink(raw: string | null | undefined): CustomerRoute | null {
  if (!raw) return null;
  let path = raw.trim();
  if (!path) return null;

  // Strip an absolute origin if one was stored.
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    return null;
  }

  // Drop query/hash and trailing slash, normalise leading slash.
  path = (path.split("?")[0] ?? "").split("#")[0] ?? "";
  if (!path) return null;
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  path = path.toLowerCase();

  if ((CUSTOMER_ROUTES as readonly string[]).includes(path)) return path as CustomerRoute;
  return ALIASES[path] ?? null;
}
