import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl border border-transparent text-sm font-semibold shadow-[0_1px_0_rgba(17,24,39,0.06)] transition-all disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[--brand-red] ring-offset-[--surface-1]",
  {
    variants: {
      variant: {
        default:
          "bg-[--brand-red] text-[--on-brand] hover:bg-[--brand-red-strong] active:bg-[--brand-red-strong]/95 focus-visible:ring-[--brand-red]",
        secondary:
          "border-[--line-strong] bg-[--surface-1] text-[--ink-1] hover:bg-[--surface-2] hover:border-[--line] active:bg-[--surface-3]",
        ghost: "bg-transparent text-[--ink-2] hover:bg-[--surface-2]",
        destructive: "bg-[#7f1d3d] text-[--on-brand] hover:bg-[#6b1734] active:bg-[#5e1430]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
