"use client";

import { TextProps } from "./types";
import { TextBase } from "./TextBase";
import { cn } from "@/lib/tailwind";

export const SmallText: React.FC<TextProps> = ({
  className,
  children,
  variant,
}) => {
  return (
    <TextBase className={cn("text-sm", className)} variant={variant}>
      {children}
    </TextBase>
  );
};
