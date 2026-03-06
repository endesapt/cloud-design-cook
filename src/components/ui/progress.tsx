import { cn } from "@/lib/utils/cn";

export type ProgressTone = "safe" | "watch" | "warning" | "critical";

function toneForValue(value: number): ProgressTone {
  if (value >= 95) return "critical";
  if (value >= 85) return "warning";
  if (value >= 70) return "watch";
  return "safe";
}

const toneStyles: Record<ProgressTone, string> = {
  safe: "var(--state-safe)",
  watch: "var(--state-watch)",
  warning: "var(--state-warning)",
  critical: "var(--state-critical)",
};

export function Progress({ value, className, tone }: { value: number; className?: string; tone?: ProgressTone }) {
  const safe = Math.max(0, Math.min(100, value));
  const resolvedTone = tone ?? toneForValue(safe);
  const showMarker = safe > 0 && safe < 100;
  const markerLeftPct = Math.min(99, Math.max(1, safe));
  const fillWidthPct = safe > 0 ? Math.max(safe, 1.5) : 0;

  return (
    <div
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-[--surface-3] ring-1 ring-inset ring-[--line]",
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
        className="h-full rounded-full transition-all"
        style={{
          width: `${fillWidthPct}%`,
          backgroundColor: toneStyles[resolvedTone],
          boxShadow: `inset 0 0 0 1px rgba(2,6,23,0.28), 0 0 14px color-mix(in srgb, ${toneStyles[resolvedTone]} 45%, transparent)`,
        }}
      />
      {showMarker ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-[2px] bg-[--ink-1]/35"
          style={{ left: `${markerLeftPct}%` }}
        />
      ) : null}
    </div>
  );
}
