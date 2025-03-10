"use client";

import { TextBase } from "./text-base";
import { TextProps } from "./types";
import { cn } from "@/lib/tailwind";

export function Text({ className, children, variant }: TextProps) {
  return (
    <TextBase className={cn("text-base", className)} variant={variant}>
      {children}
    </TextBase>
  );
}
