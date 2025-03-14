"use client";

import { TextProps } from "./types";
import { TextBase } from "./TextBase";
import { cn } from "@/lib/tailwind";

export function ExtraSmallText({ className, children, variant }: TextProps) {
  return (
    <TextBase className={cn("text-xs", className)} variant={variant}>
      {children}
    </TextBase>
  );
}
