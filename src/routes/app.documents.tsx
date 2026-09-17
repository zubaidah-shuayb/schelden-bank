import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { documentsQuery } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { user } = useAuth();
  const documents = useQuery(documentsQuery(user!.id));
  const [category, setCategory] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const list = documents.data ?? [];
  const categories = ["all", ...Array.from(new Set(list.map((d) => d.category)))];
  const filtered = category === "all" ? list : list.filter((d) => d.category === category);

  async function download(path: string | null, title: string) {
    if (!path) {
      toast.error("This document isn't available to download yet.");
      return;
    }
    setBusy(path);
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    setBusy(null);
    if (error || !data?.signedUrl) {
      toast.error("We couldn't open that document. Please try again.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    toast.success(`Opening ${title}`);
  }

  return (
    <div>
      <PageHeader
        title="Documents & statements"
        description="Statements, certificates and letters issued to you by Schelden Bank."
      />

      {categories.length > 2 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border border-border px-4 py-1.5 text-sm capitalize transition-colors",
                category === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {c === "all" ? "All documents" : c}
            </button>
          ))}
        </div>
      ) : null}

      {documents.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Your statements and bank letters will appear here as soon as they're issued."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.period_start && doc.period_end
                      ? `${formatDate(doc.period_start)} – ${formatDate(doc.period_end)}`
                      : `Issued ${formatDate(doc.created_at)}`}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {doc.category}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => download(doc.storage_path, doc.title)}
                  disabled={busy === doc.storage_path}
                >
                  <Download className="h-4 w-4" />
                  {busy === doc.storage_path ? "Opening…" : "Download"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
