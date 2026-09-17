import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  completed: "bg-emerald/10 text-emerald border-emerald/20",
  active: "bg-emerald/10 text-emerald border-emerald/20",
  verified: "bg-emerald/10 text-emerald border-emerald/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  processing: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  waiting: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  needs_information: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  flagged: "bg-destructive/10 text-destructive border-destructive/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  frozen: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
  reversed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
  closed: "bg-muted text-muted-foreground border-border",
  inactive: "bg-muted text-muted-foreground border-border",
  replaced: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        tones[value] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
