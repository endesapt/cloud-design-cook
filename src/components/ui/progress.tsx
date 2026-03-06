import { cn } from "@/lib/utils/cn";

export type ProgressTone = "safe" | "watch" | "warning" | "critical";

function toneForValue(value: number): ProgressTone {
  if (value >= 95) return "critical";
  if (value >= 85) return "warning";
  if (value >= 70) return "watch";
  return "safe";
}

const toneStyles: Record<ProgressTone, string> = {
  safe: "bg-[--state-safe]",
  watch: "bg-[--state-watch]",
  warning: "bg-[--state-warning]",
  critical: "bg-[--state-critical]",
};

export function Progress({ value, className, tone }: { value: number; className?: string; tone?: ProgressTone }) {
  const safe = Math.max(0, Math.min(100, value));
  const resolvedTone = tone ?? toneForValue(safe);
  const markerLeftPct = Math.min(98, Math.max(2, safe));

  return (
    <div
      className={cn(
        "relative h-3.5 w-full overflow-hidden rounded-full bg-[--surface-3] ring-1 ring-inset ring-[--line]",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe)}
    >
      {[20, 40, 60, 80].map((tick) => (
        <span
          key={tick}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-[--line-strong]"
          style={{ left: `${tick}%` }}
        />
      ))}
      <div
        className={cn(
          "h-full rounded-full shadow-[0_0_0_1px_rgba(17,24,39,0.08)] transition-all",
          toneStyles[resolvedTone],
        )}
        style={{ width: `${safe}%` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-[2px] bg-[--ink-1]/35"
        style={{ left: `${markerLeftPct}%` }}
      />
    </div>
  );
}
