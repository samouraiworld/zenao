"use client";

import { SmallText } from "../texts/small-text";
import { ButtonBase } from "./button-base";
import { ButtonProps } from "./types";

export function ButtonWithLabel({
  label,
  ...otherProps
}: ButtonProps & { label: string }) {
  return (
    <ButtonBase {...otherProps}>
      <SmallText variant="invert">{label}</SmallText>
    </ButtonBase>
  );
}
