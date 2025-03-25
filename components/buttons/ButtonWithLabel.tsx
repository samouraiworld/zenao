"use client";

import Text from "../texts/text";
import { ButtonBase } from "./ButtonBases";
import { ButtonProps } from "./types";

export const ButtonWithLabel: React.FC<ButtonProps & { label: string }> = ({
  label,
  ...otherProps
}) => {
  return (
    <ButtonBase {...otherProps}>
      <Text size="sm" variant="invert">
        {label}
      </Text>
    </ButtonBase>
  );
};
