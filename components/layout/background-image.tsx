"use client";

import Image, { ImageLoaderProps } from "next/image";
import { web3ImgLoader } from "@/lib/web3-img-loader";

// XXX: the 8rem blur on firefox is very ugly because ff has a 100px cap on blur
// see https://bugzilla.mozilla.org/show_bug.cgi?id=1530810

export function BackgroundImage(props: ImageLoaderProps) {
  return (
    <Image
      alt="Background"
      src={props.src}
      width={props.width}
      height={props.width}
      priority
      loader={web3ImgLoader}
      className={`absolute pointer-events-none w-full h-full blur-[8rem] opacity-25 sm:opacity-15`}
    />
  );
}
