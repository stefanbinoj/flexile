import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-black text-white border-black hover:bg-blue-600 hover:border-blue-600",
        primary: "bg-blue-600 text-white border-blue-600 hover:bg-black hover:border-black",
        critical: "bg-red text-white border-red",
        success: "bg-green text-white border-green",
        outline: "bg-transparent text-inherit border-current hover:text-blue-600",
        dashed: "bg-transparent text-inherit border-dashed border-current hover:text-blue-600",
        link: "inline-flex cursor-pointer items-center gap-1 border-none underline hover:text-blue-600 disabled:opacity-50 [&[inert]]:opacity-50 disabled:pointer-events-none",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-auto px-4 py-2",
        sm: "h-auto px-4 py-1",
        lg: "h-auto px-8 py-3",
        icon: "h-9 w-9",
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
  small?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size: sizeProp, small, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const size = sizeProp ?? (small ? "sm" : "default");

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        type={props.type || "button"}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
