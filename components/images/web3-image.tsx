"use client";

import React from "react";
import Image, { ImageProps } from "next/image";
import { web3ImgLoader } from "@/lib/web3-img-loader";

export const Web3Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ alt, src, ...props }, ref) => {
    const isWeb3 = typeof src === "string" && src.startsWith("ipfs://");

    return (
      <Image
        ref={ref}
        src={src}
        alt={alt}
        loader={isWeb3 ? web3ImgLoader : undefined}
        {...props}
      />
    );
  },
);

Web3Image.displayName = "Web3Image";
