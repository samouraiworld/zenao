"use client";

import { TextBase } from "./text-base";
import { TextProps } from "./types";
import { cn } from "@/lib/tailwind";

export function LargeText({ className, children, variant }: TextProps) {
  return (
    <TextBase
      className={cn("text-xl font-semibold", className)}
      variant={variant}
    >
      {children}
    </TextBase>
  );
}
