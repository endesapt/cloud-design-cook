import { cn } from "@/lib/utils/cn";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const variantMap: Record<BadgeVariant, string> = {
  neutral: "bg-[--surface-2] text-[--ink-2]",
  success: "bg-[#052e1a] text-[#86efac]",
  warning: "bg-[#3a2a02] text-[#fde047]",
  danger: "bg-[#3b1016] text-[#fca5a5]",
  info: "bg-[#10233d] text-[#93c5fd]",
};

export function Badge({
  children,
  className,
  variant = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: BadgeVariant;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", variantMap[variant], className)}>
      {children}
    </span>
  );
}
