import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BalanceDialog, EmptyRow, StatCard, callRpc } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { adminAuditLogsQuery, adminConversationsQuery, displayName } from "@/lib/admin-queries";
import {
  accountTypeLabels,
  formatDate,
  formatDateTime,
  formatIban,
  formatMoney,
  transactionTypeLabels,
} from "@/lib/format";
import {
  accountsQuery,
  beneficiariesQuery,
  cardsQuery,
  documentsQuery,
  holdingsQuery,
  loanSimulationsQuery,
  notificationsQuery,
  profileQuery,
  savingsGoalsQuery,
  securityEventsQuery,
  transactionsQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/admin/customers/$userId")({
  component: Customer360,
});

function Customer360() {
  const { userId } = useParams({ from: "/admin/customers/$userId" });
  const qc = useQueryClient();

  const profile = useQuery(profileQuery(userId));
  const accounts = useQuery(accountsQuery(userId));
  const transactions = useQuery(transactionsQuery(userId, 200));
  const cards = useQuery(cardsQuery(userId));
  const beneficiaries = useQuery(beneficiariesQuery(userId));
  const savings = useQuery(savingsGoalsQuery(userId));
  const holdings = useQuery(holdingsQuery(userId));
  const loans = useQuery(loanSimulationsQuery(userId));
  const documents = useQuery(documentsQuery(userId));
  const notifications = useQuery(notificationsQuery(userId));
  const events = useQuery(securityEventsQuery(userId));
  const conversations = useQuery(adminConversationsQuery());
  const audit = useQuery(adminAuditLogsQuery(300));

  const totalBalance = (accounts.data ?? []).reduce((s, a) => s + Number(a.balance), 0);
  const customerAudit = (audit.data ?? []).filter((l) => l.target_user === userId);
  const customerConversations = (conversations.data ?? []).filter((c) => c.user_id === userId);

  if (profile.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (!profile.data) {
    return <EmptyRow>This customer could not be found.</EmptyRow>;
  }

  return (
    <div>
      <Link
        to="/admin/customers"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All customers
      </Link>

      <AdminPageHeader
        title={displayName(profile.data)}
        description={`${profile.data.email ?? ""} · customer reference ${userId.slice(0, 8)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <VerificationDialog userId={userId} current={profile.data.verification_status} />
            <NotifyDialog userId={userId} />
            <OpenAccountDialog userId={userId} />
            <BalanceDialog accounts={accounts.data ?? []} trigger={<Button>Manage balance</Button>} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total balance" value={formatMoney(totalBalance)} hint={`${(accounts.data ?? []).length} accounts`} />
        <StatCard label="Verification" value={<StatusBadge value={profile.data.verification_status} />} />
        <StatCard label="Cards" value={(cards.data ?? []).length} hint={`${(cards.data ?? []).filter((c) => c.status === "frozen").length} frozen`} />
        <StatCard label="Transactions" value={(transactions.data ?? []).length} hint="Most recent 200" />
      </div>

      <Tabs defaultValue="profile" className="mt-6">
        <div className="scrollbar-hidden overflow-x-auto">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="wealth">Savings & wealth</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="security">Security & audit</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Personal information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value={profile.data.first_name} />
              <Field label="Last name" value={profile.data.last_name} />
              <Field label="Email" value={profile.data.email} />
              <Field label="Phone" value={profile.data.phone} />
              <Field label="Date of birth" value={profile.data.date_of_birth ? formatDate(profile.data.date_of_birth) : null} />
              <Field label="Nationality" value={profile.data.nationality} />
              <Field label="Street" value={profile.data.address_street} />
              <Field
                label="City"
                value={[profile.data.address_postal_code, profile.data.address_city].filter(Boolean).join(" ")}
              />
              <Field label="Country" value={profile.data.address_country} />
              <Field label="Onboarding" value={profile.data.onboarding_completed ? "Completed" : "Not completed"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4 space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-base">Accounts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(accounts.data ?? []).length === 0 ? (
                <EmptyRow>No accounts opened yet.</EmptyRow>
              ) : (
                <ul className="divide-y divide-border">
                  {(accounts.data ?? []).map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="text-sm font-medium">{accountTypeLabels[a.account_type] ?? a.account_type}</p>
                        <p className="text-xs text-muted-foreground">{formatIban(a.iban)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge value={a.status} />
                        <p className="text-sm font-semibold">{formatMoney(a.balance)}</p>
                        <BalanceDialog
                          accounts={accounts.data ?? []}
                          defaultAccountId={a.id}
                          trigger={
                            <Button size="sm" variant="outline">
                              Credit / debit
                            </Button>
                          }
                        />
                        <IssueCardDialog accountId={a.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="card-elevated">
            <CardContent className="p-0">
              {(transactions.data ?? []).length === 0 ? (
                <EmptyRow>No transactions recorded for this customer.</EmptyRow>
              ) : (
                <ul className="divide-y divide-border">
                  {(transactions.data ?? []).map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.description}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {transactionTypeLabels[t.type] ?? t.type} · {t.reference_code} ·{" "}
                          {formatDateTime(t.occurred_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge value={t.status} />
                        <span className="text-sm font-semibold">{formatMoney(t.amount)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          <Card className="card-elevated">
            <CardContent className="p-0">
              {(cards.data ?? []).length === 0 ? (
                <EmptyRow>No cards issued.</EmptyRow>
              ) : (
                <ul className="divide-y divide-border">
                  {(cards.data ?? []).map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="text-sm font-medium">{c.masked_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.card_type === "virtual" ? "Virtual" : "Physical debit"} · expires{" "}
                          {String(c.expiry_month).padStart(2, "0")}/{c.expiry_year}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge value={c.status} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const next = c.status === "frozen" ? "active" : "frozen";
                            const { error } = await (
                              await import("@/lib/supabase")
                            ).supabase
                              .from("cards")
                              .update({ status: next })
                              .eq("id", c.id);
                            if (error) toast.error(error.message);
                            else {
                              toast.success(next === "frozen" ? "Card frozen." : "Card unfrozen.");
                              qc.invalidateQueries();
                            }
                          }}
                        >
                          {c.status === "frozen" ? "Unfreeze" : "Freeze"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wealth" className="mt-4 grid gap-4 lg:grid-cols-3">
          <ListCard
            title="Savings goals"
            empty="No savings goals."
            items={(savings.data ?? []).map((g) => ({
              id: g.id,
              primary: g.name,
              secondary: `${formatMoney(g.saved_amount)} of ${formatMoney(g.target_amount)}`,
            }))}
          />
          <ListCard
            title="Investments"
            empty="No holdings."
            items={(holdings.data ?? []).map((h) => ({
              id: h.id,
              primary: h.instrument,
              secondary: `${h.units} units · ${formatMoney(Number(h.units) * Number(h.unit_value))}`,
            }))}
          />
          <ListCard
            title="Loan calculations"
            empty="No saved calculations."
            items={(loans.data ?? []).map((l) => ({
              id: l.id,
              primary: `${formatMoney(l.amount)} over ${l.term_months} months`,
              secondary: `${formatMoney(l.monthly_payment)} per month`,
            }))}
          />
        </TabsContent>

        <TabsContent value="records" className="mt-4 grid gap-4 lg:grid-cols-3">
          <ListCard
            title="Beneficiaries"
            empty="No saved beneficiaries."
            items={(beneficiaries.data ?? []).map((b) => ({
              id: b.id,
              primary: b.name,
              secondary: formatIban(b.iban),
            }))}
          />
          <ListCard
            title="Documents"
            empty="No documents."
            items={(documents.data ?? []).map((d) => ({
              id: d.id,
              primary: d.title,
              secondary: `${d.category} · ${formatDate(d.created_at)}`,
            }))}
          />
          <ListCard
            title="Notifications"
            empty="No notifications sent."
            items={(notifications.data ?? []).map((n) => ({
              id: n.id,
              primary: n.title,
              secondary: `${n.read_at ? "Read" : "Unread"} · ${formatDateTime(n.created_at)}`,
            }))}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-4 grid gap-4 lg:grid-cols-3">
          <ListCard
            title="Security activity"
            empty="No security activity recorded."
            items={(events.data ?? []).map((e) => ({
              id: e.id,
              primary: e.description,
              secondary: `${e.risk} risk · ${formatDateTime(e.created_at)}`,
            }))}
          />
          <ListCard
            title="Support conversations"
            empty="No support history."
            items={customerConversations.map((c) => ({
              id: c.id,
              primary: c.subject ?? "Live support",
              secondary: `${c.status} · ${c.priority} · ${formatDateTime(c.last_activity_at)}`,
            }))}
          />
          <ListCard
            title="Audit history"
            empty="No administrative actions."
            items={customerAudit.map((l) => ({
              id: l.id,
              primary: l.action.replace(/_/g, " "),
              secondary: `${l.admin_email ?? "Administrator"} · ${formatDateTime(l.created_at)}`,
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

function ListCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; primary: string; secondary: string }[];
}) {
  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyRow>{empty}</EmptyRow>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="px-5 py-3">
                <p className="text-sm font-medium capitalize">{i.primary}</p>
                <p className="text-xs text-muted-foreground">{i.secondary}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function VerificationDialog({ userId, current }: { userId: string; current: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(current);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Verification</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set verification status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verif">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="verif">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="needs_information">Needs information</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verif-reason">Reason</Label>
            <Textarea id="verif-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={working}
            onClick={async () => {
              setWorking(true);
              try {
                await callRpc("admin_set_verification_status", {
                  _user_id: userId,
                  _status: status,
                  _reason: reason.trim() || null,
                });
                toast.success("Verification status updated and audited.");
                await qc.invalidateQueries();
                setOpen(false);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "The change was refused.");
              } finally {
                setWorking(false);
              }
            }}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotifyDialog({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("system");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [working, setWorking] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Send notification</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a notification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notif-cat">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="notif-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="transactions">Transactions</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notif-title">Title</Label>
            <Input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notif-body">Message</Label>
            <Textarea id="notif-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={working || title.trim().length < 3}
            onClick={async () => {
              setWorking(true);
              try {
                await callRpc("admin_send_notification", {
                  _user_id: userId,
                  _category: category,
                  _title: title.trim(),
                  _body: body.trim(),
                  _link_path: null,
                });
                toast.success("Notification sent.");
                await qc.invalidateQueries();
                setOpen(false);
                setTitle("");
                setBody("");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "The notification was refused.");
              } finally {
                setWorking(false);
              }
            }}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OpenAccountDialog({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("current");
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Open account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open an account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acc-type">Account type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="acc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current account</SelectItem>
                <SelectItem value="savings">Savings account</SelectItem>
                <SelectItem value="personal_reserve">Personal reserve</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-reason">Reason</Label>
            <Input id="acc-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            The account opens with a zero balance. Money can only arrive through an audited
            transaction.
          </p>
        </div>
        <DialogFooter>
          <Button
            disabled={working}
            onClick={async () => {
              setWorking(true);
              try {
                await callRpc("admin_open_account", {
                  _user_id: userId,
                  _account_type: type,
                  _reason: reason.trim() || null,
                });
                toast.success("Account opened.");
                await qc.invalidateQueries();
                setOpen(false);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "The account could not be opened.");
              } finally {
                setWorking(false);
              }
            }}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Open account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueCardDialog({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("physical_debit");
  const [working, setWorking] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Issue card
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue a card</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="card-type">Card type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="card-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physical_debit">Physical debit</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            disabled={working}
            onClick={async () => {
              setWorking(true);
              try {
                await callRpc("admin_issue_card", {
                  _account_id: accountId,
                  _card_type: type,
                  _cardholder_name: null,
                  _reason: null,
                });
                toast.success("Card issued.");
                await qc.invalidateQueries();
                setOpen(false);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "The card could not be issued.");
              } finally {
                setWorking(false);
              }
            }}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
