import { SmallText } from "../texts/SmallText";
import { ButtonBase } from "./ButtonBases";
import { ButtonProps } from "./types";

export const ButtonWithLabel: React.FC<ButtonProps & { label: string }> = ({
  label,
  ...otherProps
}) => {
  return (
    <ButtonBase {...otherProps}>
      <SmallText variant="invert">{label}</SmallText>
    </ButtonBase>
  );
};
