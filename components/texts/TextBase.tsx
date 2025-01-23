"use client";

import {
  InvertTextVariant,
  PrimaryTextVariant,
  SecondaryTextVariant,
  TextBaseProps,
  TextProps,
} from "./types";
import { cn } from "@/lib/utils";

const PrimaryTextBase: React.FC<TextBaseProps> = ({ className, children }) => {
  return <p className={cn("text-primary-color", className)}>{children}</p>;
};

const SecondaryTextBase: React.FC<TextBaseProps> = ({
  className,
  children,
}) => {
  return <p className={cn("text-secondary-color", className)}>{children}</p>;
};

const InvertTextBase: React.FC<TextBaseProps> = ({ className, children }) => {
  return (
    <p className={cn("text-primary-color invert", className)}>{children}</p>
  );
};

export const TextBase: React.FC<TextProps> = ({
  className,
  children,
  variant,
}) => {
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
};
