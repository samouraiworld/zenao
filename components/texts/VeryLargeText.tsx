"use client";

import { TextBase } from "./TextBase";
import { TextProps } from "./types";
import { cn } from "@/lib/utils";

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
