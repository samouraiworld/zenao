import React from "react";
import { cn } from "@/lib/tailwind";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<
  CardProps & React.HTMLAttributes<HTMLDivElement>
> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "rounded px-4 py-3 bg-secondary/80 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
