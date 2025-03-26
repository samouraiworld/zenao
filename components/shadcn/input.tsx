import * as React from "react";

import { cn } from "@/lib/tailwind";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full border border-custom-input-border bg-custom-input-bg hover:bg-transparent rounded focus:bg-transparent px-3 py-2 text-base transition-colors file:border-0 file:bg-transparent file:text-sm  placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-custom-input-border disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
