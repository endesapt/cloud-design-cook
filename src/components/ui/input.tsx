import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-xl border border-[--line] bg-[--surface-2] px-3 py-2 text-sm text-[--ink-1] shadow-sm outline-none transition focus:border-[--brand-red] focus:ring-2 focus:ring-[--brand-red-soft]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
