"use client";

import React from "react";
import Image, { ImageProps } from "next/image";
import withWeb3ImgLoader from "@/lib/web3-img-loader";
import { cn } from "@/lib/tailwind";

export const Web3Image = React.forwardRef<
  HTMLImageElement,
  Omit<ImageProps, "loader"> & {
    imgFit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  }
>(({ alt, src, className, imgFit, ...props }, ref) => {
  const isWeb3 = typeof src === "string" && src.startsWith("ipfs://");

  return (
    <Image
      ref={ref}
      src={src}
      alt={alt}
      loader={isWeb3 ? withWeb3ImgLoader({ imgFit }) : undefined}
      className={cn("bg-primary/10", className)}
      {...props}
    />
  );
});

Web3Image.displayName = "Web3Image";
