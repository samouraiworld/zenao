import { cva, VariantProps } from "class-variance-authority";
import React from "react";
import { cn } from "@/lib/tailwind";

const headingVariants = cva("font-semibold", {
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
    level: {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
    level: 1,
  },
});

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, variant, size, level, ...props }, ref) => {
    const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

    return (
      <Tag
        className={cn(headingVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Heading.displayName = "Heading";

export default Heading;
