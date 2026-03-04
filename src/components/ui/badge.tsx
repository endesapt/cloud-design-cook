import { cn } from "@/lib/utils/cn";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const variantMap: Record<BadgeVariant, string> = {
  neutral: "bg-[--surface-2] text-[--ink-2]",
  success: "bg-[#dcfce7] text-[#166534]",
  warning: "bg-[#fef3c7] text-[#92400e]",
  danger: "bg-[#fee2e2] text-[#b91c1c]",
  info: "bg-[#dbeafe] text-[#1d4ed8]",
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
