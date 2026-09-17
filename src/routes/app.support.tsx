import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/support")({
  component: SupportPage,
});

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  body: string | null;
  attachment_path: string | null;
  read_at: string | null;
  created_at: string;
};

function Attachment({ path, label }: { path: string; label: string }) {
  return (
    <button
      type="button"
      className="underline"
      onClick={async () => {
        const { data, error } = await supabase.storage
          .from("support-attachments")
          .createSignedUrl(path, 60);
        if (error || !data) {
          toast.error("That attachment could not be opened.");
          return;
        }
        window.open(data.signedUrl, "_blank", "noopener");
      }}
    >
      {label}
    </button>
  );
}

function SupportPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  // A transfer that couldn't be completed can hand over its details here.
  useEffect(() => {
    try {
      const handover = sessionStorage.getItem("schelden.support.draft");
      if (handover) {
        sessionStorage.removeItem("schelden.support.draft");
        setDraft(handover);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const conversation = useQuery({
    queryKey: ["support-conversation", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return data as { id: string; status: string; admin_typing_at: string | null };

      const created = await supabase
        .from("support_conversations")
        .insert({ user_id: uid, subject: "Live support" })
        .select("*")
        .single();
      if (created.error) throw new Error(created.error.message);
      return created.data as { id: string; status: string; admin_typing_at: string | null };
    },
  });

  const conversationId = conversation.data?.id;

  const messages = useQuery({
    queryKey: ["support-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as Message[];
    },
  });

  // Realtime: new messages arrive instantly for both sides.
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`support:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["support-messages", conversationId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  // Mark the support team's messages as read.
  useEffect(() => {
    const unread = (messages.data ?? []).filter((m) => m.sender_role === "admin" && !m.read_at);
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

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !conversationId) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      conversation_id: conversationId,
      sender_id: uid,
      sender_role: "customer",
      body,
    });
    setSending(false);
    if (error) {
      toast.error("Your message didn't send. Please try again.");
      return;
    }
    setDraft("");
    qc.invalidateQueries({ queryKey: ["support-messages", conversationId] });
  }

  return (
    <div>
      <PageHeader
        title="Live support"
        description="Chat with the Schelden Bank team. Conversations clear after an hour of silence."
      />

      <Card className="card-elevated flex h-[65vh] min-h-[420px] flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
            {conversation.isLoading || messages.isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
              </div>
            ) : (messages.data ?? []).length === 0 ? (
              <p className="mx-auto max-w-sm text-center text-sm text-muted-foreground">
                Say hello — a Schelden Bank adviser in Antwerp will reply here.
              </p>
            ) : (
              (messages.data ?? []).map((m) => {
                const mine = m.sender_role === "customer";
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
                        <Attachment path={m.attachment_path} label={m.body ?? "Attachment"} />
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

          <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-3 sm:p-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(e as unknown as React.FormEvent);
                }
              }}
              rows={1}
              aria-label="Message"
              placeholder="Type your message…"
              className="min-h-11 resize-none"
            />
            <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Send">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
