"use client";

import Image, { ImageLoaderProps, ImageProps } from "next/image";
import React from "react";
import { web2URL } from "@/lib/uris";

export function web3ImgLoader({ src, width }: ImageLoaderProps) {
  if (src.startsWith("ipfs://")) {
    return `${web2URL(src)}?img-width=${width}`;
  }
  return src;
}

const Web3Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ ...props }, ref) => {
    return <Image ref={ref} {...props} alt={props.alt} />;
  },
);

Web3Image.displayName = "Web3Image";

export default Web3Image;
