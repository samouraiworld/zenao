"use client";

import Image, { ImageLoaderProps } from "next/image";
import { web3ImgLoader } from "@/lib/web3-img-loader";

export function BackgroundImage(props: Omit<ImageLoaderProps, "width">) {
  return (
    <Image
      alt="Background"
      src={props.src}
      fill
      priority
      loader={web3ImgLoader}
      className={`absolute pointer-events-none w-full h-full blur-[8rem] opacity-25 sm:opacity-15`}
    />
  );
}
