import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BookOpen,
  CreditCard,
  FileText,
  LifeBuoy,
  Lock,
  PiggyBank,
  Receipt,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  UserPlus,
  Wallet,
  Bell,
} from "lucide-react";
import type { ReactNode } from "react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/how-it-works")({
  head: () => ({
    meta: [
      { title: "Operations Guide — Schelden Bank" },
      {
        name: "description",
        content:
          "Internal Schelden Bank operations guide covering onboarding, accounts, cards, ledger, reversals, support and audit.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <div className="pb-8">
      <AdminPageHeader
        title="How it works"
        description="Internal Schelden Bank Operations Guide. Read-only reference for the operations team — nothing on this page changes customer records."
      />

      <nav
        aria-label="Guide contents"
        className="card-elevated mb-6 rounded-xl border border-border p-4"
      >
        <p className="mb-3 text-xs tracking-[0.18em] text-muted-foreground uppercase">Contents</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <s.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 [overflow-wrap:anywhere]">{s.title}</span>
            </a>
          ))}
        </div>
      </nav>

      <div className="space-y-5">
        {sections.map((s) => (
          <Section key={s.id} {...s} />
        ))}
      </div>
    </div>
  );
}

type SectionDef = {
  id: string;
  title: string;
  icon: LucideIcon;
  intro: string;
  steps?: string[];
  controlled?: { customer: string; bank: string };
  note?: string;
  body?: ReactNode;
};

function Section({ id, title, icon: Icon, intro, steps, controlled, note }: SectionDef) {
  return (
    <Card id={id} className="card-elevated scroll-mt-20">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <span className="bg-emerald/10 text-emerald inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <CardTitle className="text-base [overflow-wrap:anywhere]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{intro}</p>

        {steps ? (
          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="bg-emerald/10 text-emerald mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {i + 1}
                </span>
                <span className="min-w-0 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {controlled ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Customer-controlled
              </p>
              <p className="mt-1.5">{controlled.customer}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Bank-controlled
              </p>
              <p className="mt-1.5">{controlled.bank}</p>
            </div>
          </div>
        ) : null}

        {note ? (
          <p className="border-emerald/40 bg-emerald/5 rounded-lg border-l-2 px-3 py-2.5 text-[0.82rem]">
            <span className="text-emerald font-semibold">Security note — </span>
            {note}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

const sections: SectionDef[] = [
  {
    id: "principles",
    title: "Operating principles",
    icon: BookOpen,
    intro:
      "Schelden Bank separates personal data, which customers own, from financial records, which only the bank can move. Every figure shown in this console comes from the live database; nothing is estimated or pre-filled.",
    steps: [
      "Customers may edit their own profile, beneficiaries, savings goals, preferences and support messages.",
      "Balances, transactions, card issuance, account opening and verification status can only change through protected bank operations.",
      "Every bank-side operation is written to the audit log with the administrator who performed it.",
      "Empty screens mean there is genuinely no record yet — they are never placeholders.",
    ],
    note:
      "No client application, customer or administrator, can write balances or ledger rows directly. Those writes are rejected by database policy.",
  },
  {
    id: "onboarding",
    title: "Customer onboarding and verification",
    icon: UserPlus,
    intro:
      "A customer registers themselves, confirms their email address by link, and completes onboarding with their personal details. They arrive in the console with no accounts, no cards and no balance.",
    steps: [
      "Customer signs up and receives a verification link by email.",
      "Clicking the link confirms the address and returns them to the app.",
      "Customer completes onboarding: name, contact details, address.",
      "They appear under Customers with identity status 'pending'.",
      "An administrator reviews their submitted documents and sets identity status to verified or rejected.",
    ],
    controlled: {
      customer: "Registration, email confirmation, personal details, avatar, contact information.",
      bank: "Identity verification status, risk flags, account and card provisioning.",
    },
    note:
      "Identity status is never accepted from the browser. It is set through a protected operation and recorded against the reviewing administrator.",
  },
  {
    id: "accounts",
    title: "Account requests, opening and IBAN assignment",
    icon: Wallet,
    intro:
      "Customers cannot open their own accounts. They raise a request, an administrator reviews it, and the bank opens the account with a generated Belgian-format IBAN and a zero balance.",
    steps: [
      "Customer submits an account request from their app.",
      "Request appears on the customer's record in Customer 360.",
      "Administrator reviews identity status and any risk cases.",
      "Administrator opens the account, choosing the account type.",
      "The system generates a unique IBAN and opens the account at zero.",
      "The customer sees the new account immediately; an audit entry is written.",
    ],
    controlled: {
      customer: "Requesting an account, naming preferences, viewing their accounts.",
      bank: "Approval, IBAN assignment, account status (active, frozen, closed).",
    },
    note: "Accounts always open at zero. Funds only ever arrive through a recorded transaction.",
  },
  {
    id: "cards",
    title: "Card requests, approval and issuance",
    icon: CreditCard,
    intro:
      "Cards follow the same review-then-issue path as accounts. A card is always tied to one open account.",
    steps: [
      "Customer requests a card against one of their accounts.",
      "Administrator checks identity status and account standing.",
      "Administrator issues the card, selecting type and the account it belongs to.",
      "The system produces the masked card number, expiry and initial limits.",
      "The customer can then freeze, unfreeze or adjust the limit within bank-set boundaries.",
    ],
    controlled: {
      customer: "Requesting a card, freezing or unfreezing it, requesting a limit change.",
      bank: "Issuance, card number and expiry, permanent blocking, limit ceilings.",
    },
  },
  {
    id: "balances",
    title: "Balance management",
    icon: BadgeCheck,
    intro:
      "Balance changes are made from Accounts & balances or Customer 360. A credit or debit always posts a matching ledger entry — the balance and the transaction history can never drift apart.",
    steps: [
      "Select the account; the current balance is shown before anything is changed.",
      "Choose credit or debit, enter the amount and a description.",
      "Confirm the operation; the dialog shows the resulting balance.",
      "The account balance and the ledger are updated together in one protected operation.",
      "The customer sees the change instantly and an audit entry is recorded.",
    ],
    note:
      "Debits are refused when they would take an account below its permitted balance. Nothing is applied partially — the operation either completes fully or not at all.",
  },
  {
    id: "transactions",
    title: "Transaction creation and ledger behaviour",
    icon: Receipt,
    intro:
      "The ledger is append-only. Transactions are created by the bank, carry a status, and are never edited or deleted after posting.",
    steps: [
      "Administrator creates a transaction against an account: direction, amount, counterparty, description, date.",
      "A pending transaction is visible to the customer but does not move the balance.",
      "A completed transaction moves the balance at the moment it is posted.",
      "A failed transaction stays on the record for transparency and moves nothing.",
    ],
    controlled: {
      customer: "Viewing, filtering, searching and exporting their own transactions.",
      bank: "Creating transactions, setting status, reversing incorrect entries.",
    },
    note:
      "Customer-initiated transfers never post to the ledger themselves. They are submitted for review and resolved by the bank.",
  },
  {
    id: "reversals",
    title: "Transaction reversals",
    icon: RotateCcw,
    intro:
      "Mistakes are corrected by reversal, not by deletion. A reversal writes an opposite, clearly labelled entry and links it to the original.",
    steps: [
      "Locate the transaction and open the reversal action.",
      "Provide a reason; it is stored with the reversal.",
      "The system posts an opposing entry and marks the original as reversed.",
      "The balance is corrected by the same amount and both entries stay visible.",
    ],
    note:
      "A transaction can only be reversed once, and only a completed transaction can be reversed. The original row is never modified or removed.",
  },
  {
    id: "savings",
    title: "Savings, investments and loans",
    icon: PiggyBank,
    intro:
      "Savings goals move real money between a customer's account and their goal. Investments are bank-recorded holdings. The loan calculator is an information tool only.",
    steps: [
      "Savings: the customer creates a goal and funds it from one of their accounts. The account is debited, the goal rises and a transaction is recorded. Releasing funds reverses the movement.",
      "A customer can never fund a goal beyond their available balance, and no balance is created out of nothing.",
      "Investments: holdings and valuations are recorded by the bank. Customers view performance but cannot alter positions.",
      "Loans: the calculator estimates monthly repayments from the amount, rate and term. It creates no application, debt or record.",
    ],
    controlled: {
      customer: "Creating goals, funding and releasing within their balance, using the calculator.",
      bank: "Investment holdings and valuations, any lending decision.",
    },
  },
  {
    id: "documents",
    title: "Customer documents",
    icon: FileText,
    intro:
      "Statements, identity documents and correspondence live in private storage. Files are never publicly addressable.",
    steps: [
      "The customer uploads identity or supporting documents from their app.",
      "Administrators open documents from Documents or Customer 360.",
      "Each view generates a short-lived signed link for that request only.",
      "Documents inform identity verification and risk review.",
    ],
    note:
      "Storage is private. A customer can only reach their own files, and every administrator view is served through an expiring link rather than a permanent address.",
  },
  {
    id: "risk",
    title: "Risk and verification cases",
    icon: ShieldAlert,
    intro:
      "Risk cases record concerns raised during review — unclear documents, unusual activity or an account that needs watching.",
    steps: [
      "Open a case against a customer with a category and description.",
      "Set the severity and keep the case open while it is being worked.",
      "Record the outcome and resolve the case.",
      "Identity status and account status are adjusted separately as the outcome requires.",
    ],
    controlled: {
      customer: "Supplying documents and answering support requests.",
      bank: "Opening, grading and resolving cases; freezing accounts or cards.",
    },
  },
  {
    id: "support",
    title: "Live Support workflow and 60-minute clearing",
    icon: LifeBuoy,
    intro:
      "Live Support is a real-time conversation between a customer and the operations team, with typing indicators, read receipts and image or PDF attachments.",
    steps: [
      "The customer opens a conversation from anywhere in their app.",
      "It appears in the support inbox in real time, with unread counts.",
      "Both sides see typing indicators and read receipts as messages arrive.",
      "Attachments are stored privately and opened through expiring signed links.",
      "When a conversation has been silent from both sides for 60 minutes, its messages are cleared automatically by a scheduled task.",
    ],
    note:
      "Messages cannot be edited or deleted by either side; only read receipts can be updated. The clearing task runs on the database schedule, not in the browser, so closing the app does not affect it.",
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    intro:
      "Notifications inform customers of activity on their accounts and of messages from the bank.",
    steps: [
      "Send a notification to a customer from Notifications or Customer 360.",
      "Give it a title, body and, where useful, a destination inside the app.",
      "The customer sees it immediately and can mark it as read.",
      "Sending is recorded in the audit log.",
    ],
    controlled: {
      customer: "Reading, dismissing and choosing which categories they receive.",
      bank: "Sending notifications and issuing service messages.",
    },
  },
  {
    id: "audit",
    title: "Audit logs",
    icon: ScrollText,
    intro:
      "Every bank-side operation writes an audit entry: who acted, what changed, on which record and when.",
    steps: [
      "Audit entries are written by the protected operations themselves, not by the console.",
      "The log is read-only everywhere — it cannot be edited or cleared from this console.",
      "Use it to trace a balance change, reversal, verification decision or notification back to its author.",
    ],
    note:
      "Because audit writing happens inside the same operation as the change, an administrator cannot perform a financial action without leaving a record.",
  },
  {
    id: "permissions",
    title: "Administrator permissions",
    icon: Lock,
    intro:
      "Schelden Bank has exactly two authorised administrators. Both hold identical full access, and there is no way to create or promote another.",
    steps: [
      "Administrator rights are held in the database against the account identifier, not against an email typed in the browser.",
      "Every admin screen and every protected operation re-checks that identifier on the server side.",
      "An unauthorised sign-in receives a generic denial with no detail.",
      "There is no administrator creation, promotion or role-editing screen anywhere in this console.",
    ],
    note:
      "Even with a valid customer session, admin routes and admin operations refuse to run. Authorisation is decided by the database, never by the interface.",
  },
];
