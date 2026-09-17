export function formatMoney(amount: number | string | null | undefined, currency = "EUR") {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatIban(iban: string | null | undefined) {
  if (!iban) return "";
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function relativeDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  return formatDate(date);
}

export const accountTypeLabels: Record<string, string> = {
  current: "Current account",
  savings: "Savings account",
  personal_reserve: "Personal reserve",
};

export const transactionTypeLabels: Record<string, string> = {
  credit: "Credit",
  debit: "Debit",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  refund: "Refund",
  reversal: "Reversal",
  fee: "Fee",
  interest: "Interest",
  adjustment: "Adjustment",
  correction: "Correction",
  card_payment: "Card payment",
  atm_withdrawal: "ATM withdrawal",
  sepa_transfer: "SEPA transfer",
  other: "Other",
};

const creditTypes = new Set(["credit", "deposit", "refund", "interest"]);

export function isCredit(type: string, amount: number) {
  if (creditTypes.has(type)) return true;
  return amount > 0 && !["debit", "withdrawal", "fee", "card_payment", "atm_withdrawal"].includes(type);
}

export function initialsFrom(first?: string | null, last?: string | null, email?: string | null) {
  const a = (first ?? "").trim()[0] ?? "";
  const b = (last ?? "").trim()[0] ?? "";
  const joined = `${a}${b}`.toUpperCase();
  if (joined) return joined;
  return (email ?? "S").slice(0, 2).toUpperCase();
}
