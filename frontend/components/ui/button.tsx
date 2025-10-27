import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-wide ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:shadow-soft-hover hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/85 shadow-soft",
        outline:
          "border border-border/60 bg-background text-foreground shadow-soft hover:bg-secondary/40",
        secondary:
          "bg-secondary text-secondary-foreground shadow-soft hover:shadow-soft-hover hover:-translate-y-0.5",
        ghost: "border border-transparent bg-transparent text-foreground hover:border-border/40 hover:bg-muted/40",
        link: "text-primary underline-offset-4 hover:text-foreground hover:underline",
        gradient:
          "bg-gradient-primary text-primary-foreground shadow-glow-md hover:shadow-glow-lg hover:-translate-y-0.5",
        glass:
          "bg-white/40 dark:bg-background/60 backdrop-blur-lg border border-border/40 text-foreground hover:bg-white/55 dark:hover:bg-background/65 shadow-soft",
        success:
          "bg-gradient-success text-white shadow-soft hover:shadow-soft-hover hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 rounded-full px-4 text-sm",
        lg: "h-12 rounded-full px-8 text-base",
        xl: "h-14 rounded-full px-10 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
