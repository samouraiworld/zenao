import { TextBase } from "./TextBase";
import { TextProps } from "./types";
import { cn } from "@/lib/tailwind";

export const LargeText: React.FC<TextProps> = ({
  className,
  children,
  variant,
}) => {
  return (
    <TextBase
      className={cn("text-xl font-semibold", className)}
      variant={variant}
    >
      {children}
    </TextBase>
  );
};
