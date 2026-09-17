import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatIban } from "@/lib/format";
import { beneficiariesQuery } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/beneficiaries")({
  component: BeneficiariesPage,
});

function BeneficiariesPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const beneficiaries = useQuery(beneficiariesQuery(uid));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", iban: "", bank_name: "", reference: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("beneficiaries").insert({
        user_id: uid,
        name: form.name.trim(),
        iban: form.iban.replace(/\s+/g, "").toUpperCase(),
        bank_name: form.bank_name.trim() || null,
        reference: form.reference.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Beneficiary saved");
      setForm({ name: "", iban: "", bank_name: "", reference: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["beneficiaries", uid] });
    },
    onError: () => toast.error("We couldn't save that beneficiary. Please try again."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("beneficiaries").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Beneficiary removed");
      qc.invalidateQueries({ queryKey: ["beneficiaries", uid] });
    },
    onError: () => toast.error("We couldn't remove that beneficiary."),
  });

  const addDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add beneficiary
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a beneficiary</DialogTitle>
          <DialogDescription>
            Save the people and businesses you pay often so transfers take seconds.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="b-name">Name</Label>
            <Input
              id="b-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Lotte Van Damme"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-iban">IBAN</Label>
            <Input
              id="b-iban"
              required
              value={form.iban}
              onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })}
              placeholder="BE68 5390 0754 7034"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="b-bank">Bank name</Label>
              <Input
                id="b-bank"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-ref">Default reference</Label>
              <Input
                id="b-ref"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Save beneficiary
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div>
      <PageHeader
        title="Beneficiaries"
        description="The people and businesses you send money to."
        action={addDialog}
      />

      {beneficiaries.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (beneficiaries.data ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          title="No beneficiaries saved"
          description="Add someone you pay regularly and their details will be ready next time."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(beneficiaries.data ?? []).map((b) => (
            <Card key={b.id} className="card-elevated">
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatIban(b.iban)}</p>
                  {b.bank_name ? (
                    <p className="mt-1 text-xs text-muted-foreground">{b.bank_name}</p>
                  ) : null}
                  {b.reference ? (
                    <p className="mt-1 text-xs text-muted-foreground">Ref: {b.reference}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${b.name}`}
                  onClick={() => remove.mutate(b.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
