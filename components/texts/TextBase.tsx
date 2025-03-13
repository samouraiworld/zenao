"use client";

import Text from "./text";
import { TextProps } from "./types";

export const TextBase: React.FC<TextProps> = ({
  className,
  children,
  variant,
}) => {
  return (
    <Text className={className} variant={variant}>
      {children}
    </Text>
  );
};
