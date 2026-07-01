import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground hover:bg-[#9E3A23] hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:     "border border-[#C9BFA9] bg-transparent text-[#1A1713] hover:bg-[#EBE4D6]",
        secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:       "hover:bg-muted hover:text-foreground",
        link:        "text-primary underline-offset-4 hover:underline",
        /* terracotta CTA — the main action button */
        hero:        "bg-primary text-primary-foreground shadow-[var(--shadow-md)] hover:bg-[#9E3A23] hover:-translate-y-0.5",
        /* dark fill for primary CTA in admin context */
        premium:     "bg-slate-900 text-white border border-slate-900 hover:bg-slate-800",
        /* neutral secondary for admin actions */
        admin:       "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm:      "h-8 rounded-full px-3 text-xs",
        lg:      "h-[52px] rounded-full px-7 text-sm",
        xl:      "h-[52px] rounded-full px-7 text-base",
        icon:    "h-10 w-10",
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
