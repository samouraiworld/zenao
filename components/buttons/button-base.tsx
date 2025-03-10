"use client";

import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "../shadcn/button";

export function ButtonBase({
  children,
  loading,
  disabled,
  ...otherProps
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <Button className="w-full" disabled={disabled || loading} {...otherProps}>
      <div className={loading ? "opacity-0" : undefined}>{children}</div>
      {!!loading && <Loader2 className="animate-spin absolute" />}
    </Button>
  );
}
