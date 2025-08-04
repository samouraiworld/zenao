import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/tailwind";

const textVariants = cva("", {
  variants: {
    variant: {
      primary: "text-primary-color",
      secondary: "text-secondary-color",
      invert: "text-primary-color invert",
    },
    size: {
      default: "text-base",
      xs: "text-xs",
      sm: "text-sm",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
      "4xl": "text-4xl",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <p
        className={cn(textVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Text.displayName = "Text";

export default Text;
