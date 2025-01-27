"use client";

import { ButtonBase, LoadingButtonBase } from "./ButtonBases";
import { ButtonProps } from "./types";

export const ButtonWithChildren: React.FC<
  ButtonProps & { children: React.ReactNode }
> = ({ children, loading = false, ...otherProps }) => {
  return loading ? (
    <LoadingButtonBase />
  ) : (
    <ButtonBase {...otherProps}>{children}</ButtonBase>
  );
};
