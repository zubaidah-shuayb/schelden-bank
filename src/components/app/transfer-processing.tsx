import { useNavigate } from "@tanstack/react-router";
import { Check, Headset, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Single place to tune how long the processing experience runs. */
export const TRANSFER_SIMULATION_DURATION_MS = 14000;

const STAGES = [
  { label: "Preparing transfer", to: 15, weight: 0.1 },
  { label: "Validating transfer details", to: 35, weight: 0.16 },
  { label: "Verifying recipient information", to: 55, weight: 0.2 },
  { label: "Processing transfer", to: 72, weight: 0.2 },
  { label: "Finalizing transaction", to: 84, weight: 0.17 },
  { label: "Awaiting transaction confirmation", to: 90, weight: 0.17 },
] as const;

export type TransferDetails = {
  amount: number;
  currency?: string;
  recipientName: string;
  recipientIban: string;
  reference?: string;
};

export function makeTransferReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return `SB-TRF-${out}`;
}

function maskIban(iban: string) {
  const clean = (iban ?? "").replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function TransferProcessingOverlay({
  details,
  reference,
  onClose,
}: {
  details: TransferDetails;
  reference: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const timestamp = useMemo(() => new Date(), []);

  // Escape key closes only once the outcome is known.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && failed) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [failed, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const cumulative: { until: number; from: number; to: number }[] = [];
    let acc = 0;
    let prev = 0;
    for (const s of STAGES) {
      acc += s.weight;
      cumulative.push({ until: acc, from: prev, to: s.to });
      prev = s.to;
    }
    const tick = () => {
      const elapsed = Date.now() - startedAt.current;
      const t = Math.min(1, elapsed / TRANSFER_SIMULATION_DURATION_MS);
      let value = 90;
      let lower = 0;
      for (const seg of cumulative) {
        if (t <= seg.until) {
          const span = seg.until - lower || 1;
          const local = (t - lower) / span;
          // ease-out inside each stage so it never feels perfectly linear
          value = seg.from + (seg.to - seg.from) * (1 - Math.pow(1 - local, 1.7));
          break;
        }
        lower = seg.until;
      }
      setProgress(value);
      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => setFailed(true), 1200);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (failed) closeRef.current?.focus();
  }, [failed]);

  const stageIndex = STAGES.findIndex((s) => progress < s.to);
  const activeStage = stageIndex === -1 ? STAGES.length - 1 : stageIndex;

  function contactSupport() {
    try {
      sessionStorage.setItem(
        "schelden.support.draft",
        `I tried to send ${formatMoney(details.amount, details.currency ?? "EUR")} to ${details.recipientName} (${maskIban(details.recipientIban)}). Reference ${reference}. The transfer could not be completed — please help.`,
      );
    } catch {
      /* storage unavailable — support still opens */
    }
    onClose();
    void navigate({ to: "/app/support" });
  }

  const circumference = 2 * Math.PI * 52;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={failed ? "Transfer could not be completed" : "Transfer processing"}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-background/90 p-4 backdrop-blur-xl"
    >
      <div className="card-elevated w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <LogoMark size="sm" />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold tracking-[0.14em] uppercase">
              Schelden Bank
            </p>
            <p className="text-xs text-muted-foreground">Transfer {reference}</p>
          </div>
        </div>

        {!failed ? (
          <>
            <div className="mt-8 flex flex-col items-center">
              <div className="relative">
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-0 rounded-full bg-primary/20 blur-2xl",
                    reduced ? "" : "animate-pulse",
                  )}
                />
                <svg width="128" height="128" viewBox="0 0 120 120" className="relative -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="8"
                    className="stroke-muted"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="stroke-primary transition-[stroke-dashoffset] duration-200 ease-linear"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="font-display text-2xl font-semibold tabular-nums"
                    aria-live="polite"
                  >
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>

              <p className="mt-5 text-center font-display text-xl font-semibold [overflow-wrap:anywhere]">
                {formatMoney(details.amount, details.currency ?? "EUR")}
              </p>
              <p className="mt-1 text-center text-sm text-muted-foreground [overflow-wrap:anywhere]">
                To {details.recipientName} · {maskIban(details.recipientIban)}
              </p>
            </div>

            <ul className="mt-6 space-y-2" aria-live="polite">
              {STAGES.map((stage, i) => {
                const done = i < activeStage;
                const current = i === activeStage;
                return (
                  <li
                    key={stage.label}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      current ? "bg-muted text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : current
                            ? "border-primary text-primary"
                            : "border-border",
                      )}
                    >
                      {done ? (
                        <Check className="h-3 w-3" aria-hidden />
                      ) : current ? (
                        <Loader2
                          className={cn("h-3 w-3", reduced ? "" : "animate-spin")}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <span className="[overflow-wrap:anywhere]">{stage.label}</span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Please keep this window open while your transfer is being processed.
            </p>
          </>
        ) : (
          <>
            <div className="mt-8 flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="h-7 w-7" aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold">
                Transfer could not be completed
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                The transfer could not be completed at this time. No money has left your account.
                Please contact Schelden Bank Support for assistance.
              </p>
            </div>

            <dl className="mt-6 space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              {[
                ["Amount", formatMoney(details.amount, details.currency ?? "EUR")],
                ["Recipient", details.recipientName],
                ["Account", maskIban(details.recipientIban)],
                ["Reference", reference],
                ["Date", formatDateTime(timestamp)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium [overflow-wrap:anywhere]">{v}</dd>
                </div>
              ))}
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-right font-medium text-destructive">Failed</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <Button type="button" className="w-full sm:w-auto" onClick={contactSupport}>
                <Headset className="h-4 w-4" aria-hidden />
                Contact support
              </Button>
              <Button
                ref={closeRef}
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={onClose}
              >
                Back to transfers
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
