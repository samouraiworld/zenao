"use client";

import Image, { ImageLoaderProps } from "next/image";
import { web3ImgLoader } from "@/lib/web3-img-loader";

export function BackgroundImage(props: ImageLoaderProps) {
  return (
    <Image
      alt="Background"
      src={props.src}
      width={props.width}
      height={props.width}
      priority
      loader={web3ImgLoader}
      className="absolute pointer-events-none w-full h-[calc(100vh-var(--mobile-header))] md:h-[calc(100vh-var(--header))] blur-[8rem] opacity-25 sm:opacity-15"
    />
  );
}
