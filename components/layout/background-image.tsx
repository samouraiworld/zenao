"use client";

import Image, { ImageLoaderProps } from "next/image";
import { web3ImgLoader } from "@/lib/web3-img-loader";

export function BackgroundImage(props: ImageLoaderProps) {
  const style = {
    filter: `blur(8rem)`,
    position: `absolute`,
    width: "100%",
    height: "100%",
    zIndex: -1,
  } as const;

  return (
    <Image
      style={style}
      alt="Background"
      src={props.src}
      width={props.width}
      height={props.width}
      priority
      loader={web3ImgLoader}
      className="opacity-25 sm:opacity-15"
    />
  );
}
