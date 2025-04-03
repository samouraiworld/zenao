"use client";

import { Web3Image } from "../images/web3-image";

export interface BackgroundProps {
  src: string;
  width: number;
  height: number;
}

export function BackgroundImage(props: BackgroundProps) {
  return (
    <Web3Image
      alt="Background"
      src={props.src}
      width={props.width}
      height={props.height}
      priority
      className="absolute pointer-events-none w-full h-full top-0 blur-[8rem] opacity-25 sm:opacity-15"
    />
  );
}
