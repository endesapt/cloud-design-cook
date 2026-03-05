import { cn } from "@/lib/utils/cn";

export type ProgressTone = "safe" | "watch" | "warning" | "critical";

function toneForValue(value: number): ProgressTone {
  if (value >= 95) return "critical";
  if (value >= 85) return "warning";
  if (value >= 70) return "watch";
  return "safe";
}

const toneStyles: Record<ProgressTone, string> = {
  safe: "bg-gradient-to-r from-[--state-safe] to-[#15803d]",
  watch: "bg-gradient-to-r from-[--state-watch] to-[#a16207]",
  warning: "bg-gradient-to-r from-[--state-warning] to-[#c2410c]",
  critical: "bg-gradient-to-r from-[--state-critical] to-[#b91c1c]",
};

export function Progress({ value, className, tone }: { value: number; className?: string; tone?: ProgressTone }) {
  const safe = Math.max(0, Math.min(100, value));
  const resolvedTone = tone ?? toneForValue(safe);

  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[--surface-3] ring-1 ring-inset ring-[--line]", className)}>
      <div
        className={cn(
          "h-full rounded-full shadow-[0_0_0_1px_rgba(17,24,39,0.08)] transition-all",
          toneStyles[resolvedTone],
        )}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}
