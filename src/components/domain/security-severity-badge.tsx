import { cn } from "@/lib/utils/cn";

const styles: Record<string, string> = {
  LOW: "bg-[#052e1a] text-[#86efac]",
  MEDIUM: "bg-[#3a2a02] text-[#fde047]",
  HIGH: "bg-[#3f1d0a] text-[#fdba74]",
  CRITICAL: "bg-[#3b1016] text-[#fca5a5]",
};

export function SecuritySeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[severity] ?? "bg-[--surface-2] text-[--ink-2]",
      )}
    >
      {severity}
    </span>
  );
}
