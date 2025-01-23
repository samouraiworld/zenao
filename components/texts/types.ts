export interface TextBaseProps {
  children: React.ReactNode;
  className?: string;
}

export const PrimaryTextVariant = "primary";
export const SecondaryTextVariant = "secondary";
export const InvertTextVariant = "invert";
export type TextVariants =
  | typeof PrimaryTextVariant
  | typeof SecondaryTextVariant
  | typeof InvertTextVariant;

export interface TextProps extends TextBaseProps {
  variant?: TextVariants;
}
