"use client";

import Text from "../texts/text";
import { ButtonBase } from "./button-bases";
import { ButtonProps } from "./types";

export const ButtonWithLabel: React.FC<ButtonProps & { label: string }> = ({
  label,
  ...otherProps
}) => {
  return (
    <ButtonBase {...otherProps}>
      <Text variant="invert">{label}</Text>
    </ButtonBase>
  );
};
