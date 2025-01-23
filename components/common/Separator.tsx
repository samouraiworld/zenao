"use client";

import { cn } from "@/lib/utils";

interface SeparatorProps {
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ className }) => {
  return (
    <div className={cn("h-[1px] bg-primary-color opacity-15", className)} />
  );
};
