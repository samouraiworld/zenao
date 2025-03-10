"use client";

import { TextProps } from "./types";
import { TextBase } from "./text-base";
import { cn } from "@/lib/tailwind";

export function SmallText({ className, children, variant }: TextProps) {
  return (
    <TextBase className={cn("text-sm", className)} variant={variant}>
      {children}
    </TextBase>
  );
}
