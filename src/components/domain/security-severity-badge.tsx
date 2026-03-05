import { cn } from "@/lib/utils/cn";

const styles: Record<string, string> = {
  LOW: "bg-[#e5f7eb] text-[#14532d]",
  MEDIUM: "bg-[#fff4d6] text-[#92400e]",
  HIGH: "bg-[#ffe2d6] text-[#9a3412]",
  CRITICAL: "bg-[#fee2e2] text-[#991b1b]",
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
