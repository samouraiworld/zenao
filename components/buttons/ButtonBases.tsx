"use client";

import { Loader2 } from "lucide-react";
import { Button } from "../shadcn/button";

export const LoadingButtonBase: React.FC = () => {
  return (
    <Button className="w-full" disabled>
      <Loader2 className="animate-spin" />
    </Button>
  );
};

export const ButtonBase: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }
> = ({ children, ...otherProps }) => {
  return (
    <Button className="w-full" {...otherProps}>
      {children}
    </Button>
  );
};
