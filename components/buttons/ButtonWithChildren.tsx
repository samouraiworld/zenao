"use client";

import { ButtonBase } from "./ButtonBases";
import { ButtonProps } from "./types";

export const ButtonWithChildren: React.FC<
  ButtonProps & { children: React.ReactNode }
> = ({ children, ...otherProps }) => {
  return <ButtonBase {...otherProps}>{children}</ButtonBase>;
};
