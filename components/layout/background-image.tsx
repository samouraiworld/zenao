"use client";

import { useTranslations } from "next-intl";
import { Web3Image } from "../widgets/images/web3-image";

export interface BackgroundProps {
  src: string;
  width: number;
  height: number;
}

export function BackgroundImage(props: BackgroundProps) {
  const tImages = useTranslations("images");
  return (
    <Web3Image
      alt={tImages("background")}
      src={props.src}
      width={props.width}
      height={props.height}
      priority
      fetchPriority="high"
      className="absolute pointer-events-none w-full h-full top-0 blur-[8rem] opacity-25 sm:opacity-15 transition-opacity"
    />
  );
}
