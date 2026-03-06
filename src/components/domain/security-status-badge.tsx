import { cn } from "@/lib/utils/cn";

const styles: Record<string, string> = {
  OPEN: "bg-[#3b1016] text-[#fca5a5]",
  ACKNOWLEDGED: "bg-[#10233d] text-[#93c5fd]",
  RESOLVED: "bg-[#052e1a] text-[#86efac]",
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
