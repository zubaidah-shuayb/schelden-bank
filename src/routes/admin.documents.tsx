import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyRow } from "@/components/admin/admin-ops";
import { AdminPageHeader } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminDocumentsQuery, adminProfilesQuery, displayName } from "@/lib/admin-queries";
import { formatDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/documents")({
  component: AdminDocumentsPage,
});

function AdminDocumentsPage() {
  const documents = useQuery(adminDocumentsQuery());
  const profiles = useQuery(adminProfilesQuery());
  const [term, setTerm] = useState("");

  const nameFor = (id: string) => displayName((profiles.data ?? []).find((p) => p.id === id));

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (documents.data ?? []).filter((d) =>
      q ? `${d.title} ${d.category} ${nameFor(d.user_id)}`.toLowerCase().includes(q) : true,
    );
  }, [documents.data, profiles.data, term]);

  async function open(path: string | null) {
    if (!path) {
      toast.error("This record has no file attached.");
      return;
    }
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("That document could not be opened.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div>
      <AdminPageHeader
        title="Documents"
        description="Statements and customer documents held in private storage."
      />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search documents"
          placeholder="Title, category or customer"
          className="pl-9"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      <Card className="card-elevated">
        <CardContent className="p-0">
          {documents.isLoading ? (
            <EmptyRow>Loading documents…</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow>No documents have been added yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nameFor(d.user_id)} · {d.category} · {formatDate(d.created_at)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => open(d.storage_path)}>
                    <Download className="h-4 w-4" /> Open
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
