"use client";

import Image from "next/image";
import { web3ImgLoader } from "@/lib/web3-img-loader";

export interface BackgroundProps {
  src: string;
  width: number;
  height: number;
}

export function BackgroundImage(props: BackgroundProps) {
  return (
    <Image
      alt="Background"
      src={props.src}
      width={props.width}
      height={props.height}
      priority
      loader={web3ImgLoader}
      className="absolute pointer-events-none w-full h-full top-0 blur-[8rem] opacity-25 sm:opacity-15"
    />
  );
}
