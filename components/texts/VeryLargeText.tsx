"use client";

import { TextBase } from "./TextBase";
import { TextProps } from "./types";
import { cn } from "@/lib/tailwind";

export const VeryLargeText: React.FC<TextProps> = ({
  className,
  children,
  variant,
}) => {
  return (
    <TextBase
      className={cn("text-4xl font-semibold", className)}
      variant={variant}
    >
      {children}
    </TextBase>
  );
};
