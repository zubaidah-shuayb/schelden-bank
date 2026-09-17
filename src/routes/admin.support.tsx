import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Paperclip, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyRow } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  adminConversationsQuery,
  adminProfilesQuery,
  displayName,
  type SupportMessage,
} from "@/lib/admin-queries";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupportPage,
});

function AdminSupportPage() {
  const conversations = useQuery(adminConversationsQuery());
  const profiles = useQuery(adminProfilesQuery());
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const list = conversations.data ?? [];
  const active = list.find((c) => c.id === activeId) ?? list[0] ?? null;
  const nameFor = (id: string) => displayName((profiles.data ?? []).find((p) => p.id === id));

  // Inbox stays live: new conversations and activity arrive without a refresh.
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_conversations" },
        () => qc.invalidateQueries({ queryKey: ["admin", "support_conversations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <div>
      <AdminPageHeader
        title="Live support"
        description="Conversations clear automatically after 60 minutes with no message from either side."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="card-elevated">
          <CardContent className="p-0">
            {conversations.isLoading ? (
              <EmptyRow>Loading inbox…</EmptyRow>
            ) : list.length === 0 ? (
              <EmptyRow>No conversations yet.</EmptyRow>
            ) : (
              <ul className="scrollbar-hidden max-h-[70vh] divide-y divide-border overflow-y-auto">
                {list.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                        active?.id === c.id ? "bg-muted/60" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{nameFor(c.user_id)}</span>
                        <StatusBadge value={c.status} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.subject ?? "Live support"} · {c.priority} ·{" "}
                        {formatDateTime(c.last_activity_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {active ? (
          <ConversationPanel
            key={active.id}
            conversation={active}
            customerName={nameFor(active.user_id)}
          />
        ) : (
          <Card className="card-elevated">
            <CardContent>
              <EmptyRow>Select a conversation to reply.</EmptyRow>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ConversationPanel({
  conversation,
  customerName,
}: {
  conversation: {
    id: string;
    user_id: string;
    status: string;
    priority: string;
    internal_notes: string | null;
    assigned_admin: string | null;
    user_typing_at: string | null;
  };
  customerName: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState(conversation.internal_notes ?? "");
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const messages = useQuery({
    queryKey: ["admin", "support-messages", conversation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as SupportMessage[];
    },
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-support:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["admin", "support-messages", conversation.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  // Read receipts for the customer's messages.
  useEffect(() => {
    const unread = (messages.data ?? []).filter((m) => m.sender_role === "customer" && !m.read_at);
    if (unread.length === 0) return;
    supabase
      .from("support_messages")
      .update({ read_at: new Date().toISOString() })
      .in(
        "id",
        unread.map((m) => m.id),
      )
      .then(() => undefined);
  }, [messages.data]);

  const customerTyping =
    conversation.user_typing_at &&
    Date.now() - new Date(conversation.user_typing_at).getTime() < 8000;

  async function patchConversation(patch: Record<string, unknown>, message: string) {
    const { error } = await supabase
      .from("support_conversations")
      .update(patch)
      .eq("id", conversation.id);
    if (error) toast.error(error.message);
    else {
      toast.success(message);
      qc.invalidateQueries({ queryKey: ["admin", "support_conversations"] });
    }
  }

  async function markTyping() {
    await supabase
      .from("support_conversations")
      .update({ admin_typing_at: new Date().toISOString() })
      .eq("id", conversation.id);
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      conversation_id: conversation.id,
      sender_id: user!.id,
      sender_role: "admin",
      body,
    });
    setSending(false);
    if (error) {
      toast.error("The reply didn't send.");
      return;
    }
    setDraft("");
    qc.invalidateQueries({ queryKey: ["admin", "support-messages", conversation.id] });
  }

  async function attach(file: File) {
    const path = `${conversation.id}/${crypto.randomUUID()}-${file.name}`;
    const upload = await supabase.storage.from("support-attachments").upload(path, file);
    if (upload.error) {
      toast.error(upload.error.message);
      return;
    }
    const { error } = await supabase.from("support_messages").insert({
      conversation_id: conversation.id,
      sender_id: user!.id,
      sender_role: "admin",
      body: file.name,
      attachment_path: path,
      attachment_type: file.type,
    });
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin", "support-messages", conversation.id] });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
      <Card className="card-elevated flex h-[70vh] min-h-[440px] flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{customerName}</p>
              <p className="text-xs text-muted-foreground">
                {customerTyping ? "Typing…" : messages.isFetching ? "Syncing…" : "Connected"}
              </p>
            </div>
            <StatusBadge value={conversation.status} />
          </div>

          <div className="scrollbar-hidden flex-1 space-y-3 overflow-y-auto p-4">
            {messages.isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
              </div>
            ) : (messages.data ?? []).length === 0 ? (
              <p className="mx-auto max-w-sm text-center text-sm text-muted-foreground">
                No messages in this conversation.
              </p>
            ) : (
              (messages.data ?? []).map((m) => {
                const mine = m.sender_role === "admin";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-muted text-foreground"
                      }`}
                    >
                      {m.attachment_path ? (
                        <AttachmentLink path={m.attachment_path} label={m.body ?? "Attachment"} />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      )}
                      <p
                        className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {formatDateTime(m.created_at)}
                        {mine ? (m.read_at ? " · Read" : " · Sent") : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void attach(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Attach a file"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                void markTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(e as unknown as React.FormEvent);
                }
              }}
              rows={1}
              aria-label="Reply"
              placeholder="Write a reply…"
              className="min-h-11 resize-none"
            />
            <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Send">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="conv-status">Status</Label>
            <Select
              value={conversation.status}
              onValueChange={(v) => patchConversation({ status: v }, "Status updated.")}
            >
              <SelectTrigger id="conv-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["open", "waiting", "in_progress", "resolved", "closed"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conv-priority">Priority</Label>
            <Select
              value={conversation.priority}
              onValueChange={(v) => patchConversation({ priority: v }, "Priority updated.")}
            >
              <SelectTrigger id="conv-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["low", "normal", "high", "urgent"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              patchConversation(
                { assigned_admin: conversation.assigned_admin ? null : user!.id },
                conversation.assigned_admin ? "Unassigned." : "Assigned to you.",
              )
            }
          >
            {conversation.assigned_admin === user?.id
              ? "Unassign me"
              : conversation.assigned_admin
                ? "Take over"
                : "Assign to me"}
          </Button>
          <div className="space-y-2">
            <Label htmlFor="conv-notes">Internal notes</Label>
            <Textarea
              id="conv-notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() =>
                notes !== (conversation.internal_notes ?? "")
                  ? patchConversation({ internal_notes: notes }, "Notes saved.")
                  : undefined
              }
            />
            <p className="text-xs text-muted-foreground">Visible to operations only.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AttachmentLink({ path, label }: { path: string; label: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 underline"
      onClick={async () => {
        setLoading(true);
        const { data, error } = await supabase.storage
          .from("support-attachments")
          .createSignedUrl(path, 60);
        setLoading(false);
        if (error || !data) {
          toast.error("That attachment could not be opened.");
          return;
        }
        window.open(data.signedUrl, "_blank", "noopener");
      }}
    >
      <Paperclip className="h-3.5 w-3.5" />
      {loading ? "Opening…" : label}
    </button>
  );
}
