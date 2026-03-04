import { cn } from "@/lib/utils/cn";

export function Progress({ value, className }: { value: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[--surface-3]", className)}>
      <div className="h-full rounded-full bg-[--brand-red] transition-all" style={{ width: `${safe}%` }} />
    </div>
  );
}
