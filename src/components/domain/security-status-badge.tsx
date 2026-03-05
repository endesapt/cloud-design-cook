import { cn } from "@/lib/utils/cn";

const styles: Record<string, string> = {
  OPEN: "bg-[#fee2e2] text-[#991b1b]",
  ACKNOWLEDGED: "bg-[#dbeafe] text-[#1d4ed8]",
  RESOLVED: "bg-[#dcfce7] text-[#166534]",
};

export function SecurityStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[status] ?? "bg-[--surface-2] text-[--ink-2]",
      )}
    >
      {status}
    </span>
  );
}
