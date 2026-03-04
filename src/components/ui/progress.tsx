import { cn } from "@/lib/utils/cn";

export function Progress({ value, className }: { value: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[--surface-3] ring-1 ring-inset ring-[--line]", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[--brand-red] to-[--brand-red-strong] shadow-[0_0_0_1px_rgba(143,12,24,0.2)] transition-all"
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}
