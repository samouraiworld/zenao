import * as React from "react";

import { cn } from "@/lib/tailwind";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full border border-custom-input-border bg-custom-input-bg hover:bg-transparent rounded focus:bg-transparent px-3 py-2 text-base transition-colors file:border-0 file:bg-transparent file:text-sm  placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-custom-input-border disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
