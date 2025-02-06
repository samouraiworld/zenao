"use client";

import { TextBase } from "./TextBase";
import { TextProps } from "./types";
import { cn } from "@/lib/tailwind";

export const Text: React.FC<TextProps> = ({ className, children, variant }) => {
  return (
    <TextBase className={cn("text-base", className)} variant={variant}>
      {children}
    </TextBase>
  );
};
