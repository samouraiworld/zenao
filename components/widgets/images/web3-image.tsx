"use client";

import React from "react";
import Image, { ImageProps } from "next/image";
import { web2URL } from "@/lib/uris";
import { cn } from "@/lib/tailwind";

export const Web3Image = React.forwardRef<
  HTMLImageElement,
  Omit<ImageProps, "loader">
>(({ alt, src, className, ...props }, ref) => {
  const resolvedSrc =
    typeof src === "string" && src.startsWith("ipfs://") ? web2URL(src) : src;

  return (
    <Image
      ref={ref}
      src={resolvedSrc}
      alt={alt}
      className={cn("bg-primary/10", className)}
      {...props}
    />
  );
});

Web3Image.displayName = "Web3Image";
