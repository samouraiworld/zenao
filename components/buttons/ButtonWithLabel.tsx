"use client";

import { SmallText } from "../texts/SmallText";
import { ButtonBase, LoadingButtonBase } from "./ButtonBases";
import { ButtonProps } from "./types";

export const ButtonWithLabel: React.FC<ButtonProps & { label: string }> = ({
  label,
  loading = false,
  ...otherProps
}) => {
  return loading ? (
    <LoadingButtonBase />
  ) : (
    <ButtonBase {...otherProps}>
      <SmallText variant="invert">{label}</SmallText>
    </ButtonBase>
  );
};
