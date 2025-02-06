"use client";

import { Loader2 } from "lucide-react";
import { Button } from "../shadcn/button";

export const ButtonBase: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    loading?: boolean;
  }
> = ({ children, loading, disabled, ...otherProps }) => {
  return (
    <Button className="w-full" disabled={disabled || loading} {...otherProps}>
      <div className={loading ? "opacity-0" : undefined}>{children}</div>
      {loading && <Loader2 className="animate-spin absolute" />}
    </Button>
  );
};
