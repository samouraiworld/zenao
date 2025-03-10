"use client";

import { TextBase } from "./text-base";
import { TextProps } from "./types";
import { cn } from "@/lib/tailwind";

export function ExtraLargeText({ className, children, variant }: TextProps) {
  return (
    <TextBase
      className={cn("text-4xl font-semibold", className)}
      variant={variant}
    >
      {children}
    </TextBase>
  );
}
