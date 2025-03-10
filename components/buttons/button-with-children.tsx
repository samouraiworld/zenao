"use client";

import { ButtonBase } from "./button-base";
import { ButtonProps } from "./types";

export function ButtonWithChildren({
  children,
  ...otherProps
}: ButtonProps & { children: React.ReactNode }) {
  return <ButtonBase {...otherProps}>{children}</ButtonBase>;
}
