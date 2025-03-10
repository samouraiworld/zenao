"use client";

import {
  InvertTextVariant,
  PrimaryTextVariant,
  SecondaryTextVariant,
  TextBaseProps,
  TextProps,
} from "./types";
import { cn } from "@/lib/tailwind";

function PrimaryTextBase({ className, children }: TextBaseProps) {
  return <p className={cn("text-primary-color", className)}>{children}</p>;
}

function SecondaryTextBase({ className, children }: TextBaseProps) {
  return <p className={cn("text-secondary-color", className)}>{children}</p>;
}

function InvertTextBase({ className, children }: TextBaseProps) {
  return (
    <p className={cn("text-primary-color invert", className)}>{children}</p>
  );
}

export function TextBase({ className, children, variant }: TextProps) {
  switch (variant) {
    case PrimaryTextVariant:
      return (
        <PrimaryTextBase className={className}>{children}</PrimaryTextBase>
      );
    case SecondaryTextVariant:
      return (
        <SecondaryTextBase className={className}>{children}</SecondaryTextBase>
      );
    case InvertTextVariant:
      return <InvertTextBase className={className}>{children}</InvertTextBase>;
    default:
      return (
        <PrimaryTextBase className={className}>{children}</PrimaryTextBase>
      );
  }
}
