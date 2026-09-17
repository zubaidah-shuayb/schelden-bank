import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Snowflake, Wifi } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { cardsQuery, type Card as CardRow } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/cards")({
  component: CardsPage,
});

function CardsPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const cards = useQuery(cardsQuery(uid));

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Record<string, unknown>;
      successMessage?: string;
    }) => {
      const { error } = await supabase.from("cards").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    // Confirmation is only shown once the database has accepted the change.
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ["cards", uid] });
      if (variables.successMessage) toast.success(variables.successMessage);
    },
    onError: () => toast.error("We couldn't update that card setting."),
  });

  return (
    <div>
      <PageHeader
        title="Cards"
        description="Freeze a card instantly, set your limits and choose where it can be used."
      />

      {cards.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : (cards.data ?? []).length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No cards yet"
          description="When the bank issues a physical or virtual card, it will appear here."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {(cards.data ?? []).map((card) => (
            <CardPanel
              key={card.id}
              card={card}
              onPatch={(patch, successMessage) =>
                update.mutate({ id: card.id, patch, ...(successMessage ? { successMessage } : {}) })
              }
              busy={update.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CardPanel({
  card,
  onPatch,
  busy,
}: {
  card: CardRow;
  onPatch: (patch: Record<string, unknown>, successMessage?: string) => void;
  busy: boolean;
}) {
  const frozen = card.status === "frozen";

  return (
    <Card className="card-elevated overflow-hidden">
      <div className="relative p-4 sm:p-6">
        <div
          className={`brand-gradient relative aspect-[8/5] w-full overflow-hidden rounded-2xl text-white shadow-2xl transition-all ${
            frozen ? "saturate-[0.25]" : ""
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.14)_45%,transparent_60%)]" />
          <LogoMark className="pointer-events-none absolute -top-12 -right-10 h-56 w-56 opacity-[0.08]" />

          <div className="relative flex h-full flex-col justify-between p-5 sm:p-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-sm font-semibold tracking-[0.22em] uppercase">
                  Schelden Bank
                </p>
                <p className="mt-0.5 text-[10px] tracking-[0.3em] text-white/60 uppercase">
                  {card.card_type === "virtual" ? "Virtual card" : "Debit card"}
                </p>
              </div>
              <Wifi className="h-5 w-5 rotate-90 text-white/80" />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-12 rounded-md border border-amber-200/60 bg-gradient-to-br from-amber-100 via-amber-300 to-amber-200 shadow-inner">
                <div className="mx-auto mt-1.5 h-6 w-9 rounded-sm border border-amber-400/60 bg-[linear-gradient(90deg,transparent_45%,rgba(120,80,10,0.35)_45%,rgba(120,80,10,0.35)_55%,transparent_55%),linear-gradient(0deg,transparent_45%,rgba(120,80,10,0.35)_45%,rgba(120,80,10,0.35)_55%,transparent_55%)]" />
              </div>
              <p className="font-display text-sm tracking-[0.3em] text-white/90 sm:text-lg">
                {card.masked_number}
              </p>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] tracking-[0.25em] text-white/60 uppercase">Cardholder</p>
                <p className="text-sm font-medium tracking-widest uppercase">
                  {card.cardholder_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] tracking-[0.25em] text-white/60 uppercase">Expires</p>
                <p className="text-sm font-medium tracking-widest">
                  {String(card.expiry_month).padStart(2, "0")}/
                  {String(card.expiry_year).slice(-2)}
                </p>
              </div>
            </div>
          </div>

          {frozen ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 text-foreground backdrop-blur-sm">
              <Snowflake className="h-6 w-6 text-sky-500" aria-hidden />
              <p className="font-display text-lg font-semibold">Card frozen</p>
              <p className="text-xs text-muted-foreground">No payments can be made with this card.</p>
            </div>
          ) : null}
        </div>
      </div>

      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge value={card.status} />
          <Button
            variant={frozen ? "default" : "outline"}
            size="sm"
            disabled={busy || !["active", "frozen"].includes(card.status)}
            onClick={() =>
              onPatch(
                { status: frozen ? "active" : "frozen" },
                frozen ? "Card unfrozen" : "Card frozen",
              )
            }
          >
            <Snowflake className="h-4 w-4" />
            {frozen ? "Unfreeze card" : "Freeze card"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`daily-${card.id}`}>Daily limit (EUR)</Label>
            <Input
              id={`daily-${card.id}`}
              type="number"
              min="0"
              step="10"
              defaultValue={Number(card.daily_limit)}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (value >= 0 && value !== Number(card.daily_limit)) {
                  onPatch({ daily_limit: value }, `Daily limit set to ${formatMoney(value)}`);
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`monthly-${card.id}`}>Monthly limit (EUR)</Label>
            <Input
              id={`monthly-${card.id}`}
              type="number"
              min="0"
              step="50"
              defaultValue={Number(card.monthly_limit)}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (value >= 0 && value !== Number(card.monthly_limit)) {
                  onPatch({ monthly_limit: value }, `Monthly limit set to ${formatMoney(value)}`);
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          <ToggleRow
            id={`online-${card.id}`}
            label="Online payments"
            description="Use this card on websites and in apps."
            checked={card.online_payments_enabled}
            onChange={(v) => onPatch({ online_payments_enabled: v })}
          />
          <ToggleRow
            id={`contactless-${card.id}`}
            label="Contactless"
            description="Tap to pay in shops."
            icon
            checked={card.contactless_enabled}
            onChange={(v) => onPatch({ contactless_enabled: v })}
          />
          <ToggleRow
            id={`intl-${card.id}`}
            label="International payments"
            description="Allow payments outside Belgium."
            checked={card.international_enabled}
            onChange={(v) => onPatch({ international_enabled: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="flex items-center gap-2">
          {icon ? <Wifi className="h-3.5 w-3.5 rotate-90" aria-hidden /> : null}
          {label}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
